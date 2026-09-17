import { Faculty } from '../models/Faculty.js';
import { notify } from './notification.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('faculty-approval');

async function resolveActorInstitution(actorId) {
  const actor = await Faculty.findById(actorId).populate('institutionId', 'name');
  if (!actor?.institutionId) {
    const err = new Error('Your admin account is not linked to an institution');
    err.code = 'NO_INSTITUTION';
    err.status = 400;
    throw err;
  }
  return { actor, institution: actor.institutionId };
}

/**
 * Serialiser for the College Admin roster views. Includes fields the admin
 * needs to make decisions but nothing more.
 */
function serialize(f) {
  return {
    id: f._id.toString(),
    name: f.name,
    email: f.email,
    designation: f.designation,
    department: f.department || '',
    verificationStatus: f.verificationStatus,
    awaitingOnboarding: !f.passwordHash,
    invitedAt: f.invitedAt,
    createdAt: f.createdAt,
    lastLogin: f.lastLogin,
  };
}

export async function listAtInstitution(actorId, { status } = {}) {
  const { institution } = await resolveActorInstitution(actorId);
  const query = { institutionId: institution._id, role: 'Faculty' };
  if (status) query.verificationStatus = status;
  const docs = await Faculty.find(query).sort({ createdAt: -1 });
  return {
    institutionId: institution._id.toString(),
    faculty: docs.map(serialize),
  };
}

export async function pendingAtInstitution(actorId) {
  return listAtInstitution(actorId, { status: 'pending' });
}

export async function approveFaculty(actorId, facultyId) {
  const { institution } = await resolveActorInstitution(actorId);
  const target = await Faculty.findOne({
    _id: facultyId,
    institutionId: institution._id,
    role: 'Faculty',
  });
  if (!target) {
    const err = new Error('Faculty not found at your institution');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (target.verificationStatus === 'verified') {
    return { faculty: serialize(target), alreadyVerified: true };
  }
  target.verificationStatus = 'verified';
  await target.save();
  logger.info('faculty approved', {
    facultyId: target._id.toString(),
    institutionId: institution._id.toString(),
    by: actorId,
  });
  // Cross-channel notify: in-app card + email in one call. Fire-and-
  // forget so a downed email transport can't block the approval flow.
  notify(target, 'faculty_approved', {
    institutionName: institution.name,
    institutionId: institution._id.toString(),
  }).catch(err => logger.warn('faculty_approved notify failed', { error: err.message }));

  return { faculty: serialize(target) };
}

export async function rejectFaculty(actorId, facultyId, { reason } = {}) {
  const { institution } = await resolveActorInstitution(actorId);
  const target = await Faculty.findOne({
    _id: facultyId,
    institutionId: institution._id,
    role: 'Faculty',
  });
  if (!target) {
    const err = new Error('Faculty not found at your institution');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  target.verificationStatus = 'rejected';
  // Detach — a rejected faculty should not remain "at" the institution.
  const institutionName = institution.name;
  target.institutionId = null;
  await target.save();
  logger.info('faculty rejected', {
    facultyId: target._id.toString(),
    institutionId: institution._id.toString(),
    by: actorId,
    reason,
  });
  notify(target, 'faculty_rejected', {
    institutionName,
    reason: reason || null,
  }).catch(err => logger.warn('faculty_rejected notify failed', { error: err.message }));

  return { faculty: serialize(target) };
}
