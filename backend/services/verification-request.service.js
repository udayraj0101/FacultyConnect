import { VerificationRequest } from '../models/VerificationRequest.js';
import { Institution } from '../models/Institution.js';

export async function listRequests({ status, entityType, page, limit }) {
  const query = {};
  if (status) query.status = status;
  if (entityType) query.entityType = entityType;

  const [total, docs] = await Promise.all([
    VerificationRequest.countDocuments(query),
    VerificationRequest.find(query)
      .sort({ status: 1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'entityId' })
      .populate({ path: 'reviewedBy', select: 'name email' }),
  ]);

  return {
    requests: docs.map(d => d.toPublicJSON()),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function reviewRequest(id, { decision, reason }, reviewerId) {
  const req = await VerificationRequest.findById(id);
  if (!req) {
    const err = new Error('Verification request not found');
    err.code = 'VERIFICATION_REQUEST_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (req.status !== 'pending') {
    const err = new Error(`Request has already been ${req.status}`);
    err.code = 'REQUEST_ALREADY_REVIEWED';
    err.status = 409;
    throw err;
  }

  req.status = decision;
  req.reviewedBy = reviewerId;
  req.reviewedAt = new Date();
  req.reason = reason?.trim() || null;
  await req.save();

  if (req.entityType === 'institution') {
    await Institution.findByIdAndUpdate(req.entityId, {
      verificationStatus: decision === 'approved' ? 'verified' : 'rejected',
    });
  }

  const populated = await VerificationRequest.findById(id)
    .populate({ path: 'entityId' })
    .populate({ path: 'reviewedBy', select: 'name email' });
  return populated;
}
