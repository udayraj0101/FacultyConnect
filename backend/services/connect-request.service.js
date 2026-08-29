import { ConnectRequest, PURPOSE_LABELS } from '../models/ConnectRequest.js';
import { Faculty } from '../models/Faculty.js';
import { emit as emitNotification } from './notification.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('connect-request');

const DAILY_LIMIT = 10;

function serializeFaculty(f, { includeEmail } = {}) {
  if (!f || typeof f !== 'object' || !f._id) return null;
  const inst = f.institutionId;
  const populatedInst =
    inst && typeof inst === 'object' && inst._id
      ? { id: inst._id.toString(), name: inst.name, verificationStatus: inst.verificationStatus }
      : null;
  return {
    id: f._id.toString(),
    name: f.name,
    designation: f.designation,
    orcidId: f.orcidId,
    domainTags: (f.domainTags || []).slice(0, 6),
    institution: populatedInst,
    email: includeEmail ? f.email : undefined,
  };
}

function serialize(reqDoc, viewerId) {
  const status = reqDoc.status;
  // Contact reveal per PRD §3.5: only unlock the *other* party's email once
  // the receiver has accepted. Both viewers get contact of the counterpart.
  const includeEmail = status === 'accepted';
  const viewerIsFrom = reqDoc.fromFacultyId?._id?.toString?.() === viewerId?.toString?.();
  return {
    id: reqDoc._id.toString(),
    purpose: reqDoc.purpose,
    purposeLabel: PURPOSE_LABELS[reqDoc.purpose] || reqDoc.purpose,
    message: reqDoc.message,
    status,
    createdAt: reqDoc.createdAt,
    respondedAt: reqDoc.respondedAt,
    direction: viewerIsFrom ? 'sent' : 'received',
    from: serializeFaculty(reqDoc.fromFacultyId, { includeEmail }),
    to: serializeFaculty(reqDoc.toFacultyId, { includeEmail }),
  };
}

export async function create({ fromFacultyId, toFacultyId, purpose, message }) {
  if (fromFacultyId === toFacultyId) {
    const err = new Error("You can't send a connect request to yourself");
    err.code = 'SELF_CONNECT';
    err.status = 400;
    throw err;
  }
  const receiver = await Faculty.findOne({
    _id: toFacultyId,
    directoryVisible: true,
    role: 'Faculty',
  });
  if (!receiver) {
    const err = new Error('Recipient not found or is not discoverable');
    err.code = 'RECIPIENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Daily throttle per sender (PRD §3.5, §8): 10 requests / 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sentToday = await ConnectRequest.countDocuments({
    fromFacultyId,
    createdAt: { $gte: since },
  });
  if (sentToday >= DAILY_LIMIT) {
    const err = new Error(
      `Daily connect-request limit reached (${DAILY_LIMIT}). Try again tomorrow.`,
    );
    err.code = 'DAILY_LIMIT_REACHED';
    err.status = 429;
    throw err;
  }

  try {
    const doc = await ConnectRequest.create({
      fromFacultyId,
      toFacultyId,
      purpose,
      message,
      status: 'pending',
    });
    logger.info('connect request created', {
      requestId: doc._id.toString(),
      fromFacultyId,
      toFacultyId,
      purpose,
    });
    const populated = await ConnectRequest.findById(doc._id)
      .populate({ path: 'fromFacultyId', populate: { path: 'institutionId', select: 'name verificationStatus' } })
      .populate({ path: 'toFacultyId', populate: { path: 'institutionId', select: 'name verificationStatus' } });

    // Fire notification to recipient — non-blocking.
    emitNotification({
      facultyId: toFacultyId,
      type: 'connect_request_received',
      title: `${populated.fromFacultyId?.name || 'A faculty member'} wants to connect`,
      body: PURPOSE_LABELS[purpose] || purpose,
      link: '/requests',
      metadata: { requestId: doc._id.toString(), purpose },
    });

    return serialize(populated, fromFacultyId);
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error(
        'A pending request to this faculty already exists. Wait for a response first.',
      );
      err.code = 'DUPLICATE_PENDING';
      err.status = 409;
      throw err;
    }
    throw error;
  }
}

export async function list({ viewerId, direction, status }) {
  const query = {};
  if (direction === 'sent') query.fromFacultyId = viewerId;
  else query.toFacultyId = viewerId;
  if (status) query.status = status;

  const docs = await ConnectRequest.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: 'fromFacultyId',
      populate: { path: 'institutionId', select: 'name verificationStatus' },
    })
    .populate({
      path: 'toFacultyId',
      populate: { path: 'institutionId', select: 'name verificationStatus' },
    });

  return {
    requests: docs.map(d => serialize(d, viewerId)),
    total: docs.length,
  };
}

export async function respond({ requestId, viewerId, decision }) {
  const req = await ConnectRequest.findById(requestId);
  if (!req) {
    const err = new Error('Request not found');
    err.code = 'REQUEST_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (req.toFacultyId.toString() !== viewerId.toString()) {
    const err = new Error('Only the recipient can respond to a request');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }
  if (req.status !== 'pending') {
    const err = new Error(`Request has already been ${req.status}`);
    err.code = 'ALREADY_RESPONDED';
    err.status = 409;
    throw err;
  }
  req.status = decision;
  req.respondedAt = new Date();
  await req.save();
  logger.info('connect request responded', {
    requestId: req._id.toString(),
    decision,
  });
  const populated = await ConnectRequest.findById(req._id)
    .populate({ path: 'fromFacultyId', populate: { path: 'institutionId', select: 'name verificationStatus' } })
    .populate({ path: 'toFacultyId', populate: { path: 'institutionId', select: 'name verificationStatus' } });

  // Notify the sender of the response — non-blocking.
  emitNotification({
    facultyId: populated.fromFacultyId?._id,
    type: decision === 'accepted' ? 'connect_request_accepted' : 'connect_request_declined',
    title:
      decision === 'accepted'
        ? `${populated.toFacultyId?.name || 'A faculty member'} accepted your connect request`
        : `${populated.toFacultyId?.name || 'A faculty member'} declined your connect request`,
    body:
      decision === 'accepted'
        ? 'Contact details are now revealed to both of you.'
        : 'They chose not to connect this time.',
    link: '/requests',
    metadata: { requestId: req._id.toString(), decision },
  });

  return serialize(populated, viewerId);
}

/**
 * Returns whichever connection state exists (if any) between the viewer
 * and the given faculty. Used to render the DirectoryProfile CTA correctly.
 */
export async function myConnectionWith(viewerId, otherFacultyId) {
  const req = await ConnectRequest.findOne({
    $or: [
      { fromFacultyId: viewerId, toFacultyId: otherFacultyId },
      { fromFacultyId: otherFacultyId, toFacultyId: viewerId },
    ],
  })
    .sort({ createdAt: -1 })
    .populate({ path: 'fromFacultyId', populate: { path: 'institutionId', select: 'name verificationStatus' } })
    .populate({ path: 'toFacultyId', populate: { path: 'institutionId', select: 'name verificationStatus' } });
  if (!req) return null;
  return serialize(req, viewerId);
}

export async function pendingReceivedCount(viewerId) {
  return ConnectRequest.countDocuments({ toFacultyId: viewerId, status: 'pending' });
}

/**
 * Returns the viewer's accepted-connections network: union of both directions,
 * deduped by counterpart (most recent accepted entry wins if multiple exist),
 * flattened to a counterpart-oriented shape with contact revealed.
 */
export async function myNetwork(viewerId) {
  const docs = await ConnectRequest.find({
    status: 'accepted',
    $or: [{ fromFacultyId: viewerId }, { toFacultyId: viewerId }],
  })
    .sort({ respondedAt: -1 })
    .populate({
      path: 'fromFacultyId',
      populate: { path: 'institutionId', select: 'name verificationStatus' },
    })
    .populate({
      path: 'toFacultyId',
      populate: { path: 'institutionId', select: 'name verificationStatus' },
    });

  const seen = new Set();
  const connections = [];
  for (const d of docs) {
    const viewerIsFrom = d.fromFacultyId?._id?.toString() === viewerId.toString();
    const counterpartDoc = viewerIsFrom ? d.toFacultyId : d.fromFacultyId;
    if (!counterpartDoc || !counterpartDoc._id) continue;
    const cpId = counterpartDoc._id.toString();
    if (seen.has(cpId)) continue;
    seen.add(cpId);
    connections.push({
      requestId: d._id.toString(),
      connectedAt: d.respondedAt,
      purpose: d.purpose,
      purposeLabel: PURPOSE_LABELS[d.purpose] || d.purpose,
      initiatedBy: viewerIsFrom ? 'you' : 'them',
      counterpart: serializeFaculty(counterpartDoc, { includeEmail: true }),
    });
  }
  return { connections, total: connections.length };
}
