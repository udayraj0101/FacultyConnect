import { Report } from '../models/Report.js';
import { Opportunity } from '../models/Opportunity.js';
import { Job } from '../models/Job.js';
import { Faculty } from '../models/Faculty.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('report.service');

async function fetchTargetSnapshot(targetType, targetId) {
  if (targetType === 'opportunity') {
    const o = await Opportunity.findById(targetId).select('title type organizerName verificationBadge');
    if (!o) return null;
    return {
      title: o.title,
      subtitle: o.organizerName,
      extra: { type: o.type, verificationBadge: o.verificationBadge },
    };
  }
  if (targetType === 'job') {
    const j = await Job.findById(targetId).select('title designation department institutionId').populate('institutionId', 'name');
    if (!j) return null;
    return {
      title: j.title,
      subtitle: `${j.designation} · ${j.institutionId?.name || ''}`.trim(),
      extra: { department: j.department },
    };
  }
  if (targetType === 'faculty') {
    const f = await Faculty.findById(targetId).select('name designation institutionId').populate('institutionId', 'name');
    if (!f) return null;
    return {
      title: f.name,
      subtitle: `${f.designation} Professor · ${f.institutionId?.name || ''}`.trim(),
      extra: {},
    };
  }
  return null;
}

export async function create({ reporterId, targetType, targetId, category, reason }) {
  const snapshot = await fetchTargetSnapshot(targetType, targetId);
  if (!snapshot) {
    const err = new Error('Report target does not exist');
    err.code = 'TARGET_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (targetType === 'faculty' && targetId === reporterId.toString()) {
    const err = new Error("You can't report your own account");
    err.code = 'SELF_REPORT';
    err.status = 400;
    throw err;
  }

  const doc = await Report.create({
    targetType,
    targetId,
    targetSnapshot: snapshot,
    reporterId,
    category,
    reason,
    status: 'open',
    slaDeadline: Report.slaDeadlineFromNow(),
  });
  logger.info('report created', {
    reportId: doc._id.toString(),
    targetType,
    targetId,
    category,
    reporterId,
  });
  const populated = await Report.findById(doc._id)
    .populate('reporterId', 'name email')
    .populate('reviewedBy', 'name');
  return populated.toPublicJSON();
}

export async function listForAdmin({ status, targetType, page, limit }) {
  const query = {};
  if (status) query.status = status;
  if (targetType) query.targetType = targetType;
  const [total, docs] = await Promise.all([
    Report.countDocuments(query),
    Report.find(query)
      // Most urgent first: open + closest slaDeadline. Resolved/dismissed at bottom.
      .sort({ status: 1, slaDeadline: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reporterId', 'name email')
      .populate('reviewedBy', 'name'),
  ]);
  return {
    reports: docs.map(d => d.toPublicJSON()),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function review({ reportId, viewerId, decision, notes }) {
  const doc = await Report.findById(reportId);
  if (!doc) {
    const err = new Error('Report not found');
    err.code = 'REPORT_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (doc.status === 'resolved' || doc.status === 'dismissed') {
    const err = new Error(`Report already ${doc.status}`);
    err.code = 'ALREADY_CLOSED';
    err.status = 409;
    throw err;
  }
  const now = new Date();
  doc.reviewedBy = viewerId;
  doc.reviewNotes = notes?.trim() || null;
  if (decision === 'acknowledged') {
    doc.status = 'acknowledged';
    doc.acknowledgedAt = now;
  } else if (decision === 'resolved') {
    doc.status = 'resolved';
    if (!doc.acknowledgedAt) doc.acknowledgedAt = now;
    doc.resolvedAt = now;
  } else if (decision === 'dismissed') {
    doc.status = 'dismissed';
    if (!doc.acknowledgedAt) doc.acknowledgedAt = now;
    doc.resolvedAt = now;
  }
  await doc.save();
  logger.info('report reviewed', { reportId: doc._id.toString(), decision });
  const populated = await Report.findById(doc._id)
    .populate('reporterId', 'name email')
    .populate('reviewedBy', 'name');
  return populated.toPublicJSON();
}

export async function listMine(reporterId) {
  const docs = await Report.find({ reporterId })
    .sort({ createdAt: -1 })
    .populate('reviewedBy', 'name');
  return docs.map(d => d.toPublicJSON());
}

export async function summary() {
  const [open, overdue] = await Promise.all([
    Report.countDocuments({ status: 'open' }),
    Report.countDocuments({ status: 'open', slaDeadline: { $lt: new Date() } }),
  ]);
  return { open, overdue };
}
