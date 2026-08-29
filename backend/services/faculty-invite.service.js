import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { issueOnboardingToken } from './onboarding.service.js';
import { sendFacultyInvite } from './email.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('faculty-invite');

/**
 * Only CollegeAdmins can invite, and only for their own institution. This
 * is enforced by requireRole + the actor.institutionId check in each
 * invite entrypoint.
 */
async function resolveActorInstitution(actorId) {
  const actor = await Faculty.findById(actorId).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!actor) {
    const err = new Error('Actor not found');
    err.code = 'ACTOR_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (!actor.institutionId) {
    const err = new Error('Your admin account is not linked to an institution');
    err.code = 'NO_INSTITUTION';
    err.status = 400;
    throw err;
  }
  return { actor, institution: actor.institutionId };
}

async function inviteSingle({ actor, institution, name, email }) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedName = (name || '').trim();

  // Already-registered handling: three cases.
  const existing = await Faculty.findOne({ email: trimmedEmail });
  if (existing) {
    // 1) Already a member of this institution — nothing to do.
    if (
      existing.institutionId &&
      existing.institutionId.toString() === institution._id.toString() &&
      existing.passwordHash
    ) {
      return { status: 'already_member', email: trimmedEmail, facultyId: existing._id.toString() };
    }
    // 2) Registered elsewhere / no institution — attach + re-send invite
    //    if they never set a password. If they have a password already at
    //    another institution, we don't overwrite that quietly.
    if (existing.passwordHash && existing.institutionId) {
      return {
        status: 'exists_elsewhere',
        email: trimmedEmail,
        message: 'Already registered at another institution',
      };
    }
    // Attach and re-issue token
    existing.institutionId = institution._id;
    existing.verificationStatus = 'verified'; // vouched-for
    existing.invitedByFacultyId = actor._id;
    existing.invitedAt = new Date();
    if (trimmedName && !existing.name) existing.name = trimmedName;
    await existing.save();
    const token = await issueOnboardingToken(existing._id);
    await sendFacultyInvite({
      toEmail: existing.email,
      toName: existing.name,
      invitedByName: actor.name,
      institutionName: institution.name,
      token,
    });
    logger.info('invite re-sent to existing faculty', {
      facultyId: existing._id.toString(),
      institutionId: institution._id.toString(),
    });
    return { status: 'invited', email: trimmedEmail, facultyId: existing._id.toString() };
  }

  // Brand-new faculty — create placeholder account with no password.
  const doc = await Faculty.create({
    name: trimmedName || trimmedEmail.split('@')[0],
    email: trimmedEmail,
    role: 'Faculty',
    institutionId: institution._id,
    invitedByFacultyId: actor._id,
    invitedAt: new Date(),
    verificationStatus: 'verified', // vouched-for by college admin
  });
  const token = await issueOnboardingToken(doc._id);
  await sendFacultyInvite({
    toEmail: doc.email,
    toName: doc.name,
    invitedByName: actor.name,
    institutionName: institution.name,
    token,
  });
  logger.info('invited new faculty', {
    facultyId: doc._id.toString(),
    institutionId: institution._id.toString(),
  });
  return { status: 'invited', email: trimmedEmail, facultyId: doc._id.toString() };
}

export async function inviteOneByActor(actorId, { name, email }) {
  const { actor, institution } = await resolveActorInstitution(actorId);
  return inviteSingle({ actor, institution, name, email });
}

export async function inviteBulkByActor(actorId, entries) {
  const { actor, institution } = await resolveActorInstitution(actorId);
  const results = [];
  const seen = new Set();
  for (const raw of entries) {
    const email = (raw?.email || '').trim().toLowerCase();
    const name = (raw?.name || '').trim();
    if (!email) {
      results.push({ status: 'skipped', reason: 'missing_email', input: raw });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      results.push({ status: 'skipped', reason: 'invalid_email', email, input: raw });
      continue;
    }
    if (seen.has(email)) {
      results.push({ status: 'skipped', reason: 'duplicate_in_batch', email });
      continue;
    }
    seen.add(email);
    try {
      const r = await inviteSingle({ actor, institution, name, email });
      results.push(r);
    } catch (err) {
      results.push({
        status: 'error',
        email,
        message: err.message,
        code: err.code,
      });
    }
  }
  const summary = {
    total: entries.length,
    invited: results.filter(r => r.status === 'invited').length,
    alreadyMember: results.filter(r => r.status === 'already_member').length,
    existsElsewhere: results.filter(r => r.status === 'exists_elsewhere').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
  };
  logger.info('bulk invite summary', { ...summary, institutionId: institution._id.toString() });
  return { summary, results };
}
