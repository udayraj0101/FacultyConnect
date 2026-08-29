import { Faculty } from '../models/Faculty.js';
import {
  sendApprovalNotification,
  sendRejectionNotification,
} from './email.service.js';
import { emit as emitNotification } from './notification.service.js';
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
  // Fire-and-forget — don't block the approval on email delivery.
  sendApprovalNotification({
    toEmail: target.email,
    toName: target.name,
    institutionName: institution.name,
  }).catch(err => logger.warn('approval email failed', { error: err.message }));

  // In-app notification too (email might land in spam).
  emitNotification({
    facultyId: target._id,
    type: 'faculty_approved',
    title: `You're verified at ${institution.name}`,
    body: 'You now appear as a verified faculty member across the platform.',
    link: '/profile',
    metadata: { institutionId: institution._id.toString() },
  });

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
  sendRejectionNotification({
    toEmail: target.email,
    toName: target.name,
    institutionName,
    reason,
  }).catch(err => logger.warn('rejection email failed', { error: err.message }));

  emitNotification({
    facultyId: target._id,
    type: 'faculty_rejected',
    title: `Your affiliation with ${institutionName} was not approved`,
    body: reason || 'The college admin was unable to verify your affiliation.',
    link: '/profile',
    metadata: { institutionName, reason: reason || null },
  });

  return { faculty: serialize(target) };
}
