import { Institution } from '../models/Institution.js';
import { VerificationRequest } from '../models/VerificationRequest.js';

export async function createInstitution(payload) {
  const existing = await Institution.findOne({ domain: payload.domain });
  if (existing) {
    const err = new Error('An institution with this domain already exists');
    err.code = 'DOMAIN_TAKEN';
    err.status = 409;
    throw err;
  }
  const inst = await Institution.create({ ...payload, verificationStatus: 'pending' });
  await VerificationRequest.create({
    entityType: 'institution',
    entityId: inst._id,
    entityRefModel: 'Institution',
    submittedDocs: [],
    status: 'pending',
  });
  return inst;
}

export async function listInstitutions({ q, verifiedOnly, page, limit }) {
  const query = {};
  if (verifiedOnly) query.verificationStatus = 'verified';
  if (q) {
    query.$or = [
      { name: { $regex: escapeRegex(q), $options: 'i' } },
      { domain: { $regex: escapeRegex(q), $options: 'i' } },
    ];
  }
  const [total, docs] = await Promise.all([
    Institution.countDocuments(query),
    Institution.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return {
    institutions: docs.map(d => d.toPublicJSON()),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getById(id) {
  const inst = await Institution.findById(id);
  if (!inst) {
    const err = new Error('Institution not found');
    err.code = 'INSTITUTION_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return inst;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
