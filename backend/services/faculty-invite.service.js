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

/**
 * CA-01 domain check: refuse invites whose email domain doesn't match the
 * institution's registered domain, unless the admin explicitly overrides
 * (allowDomainMismatch=true). Prevents the "any email gets minted as
 * verified" gap the QA report caught. Case-insensitive comparison.
 *
 * Returns `null` when the domains match or the check is bypassed; returns
 * a { code, invitedDomain, institutionDomain } tuple when it should block.
 * Callers convert this to either a hard error (single invite) or a
 * per-row skip reason (bulk).
 */
function domainMismatch({ email, institution, allowDomainMismatch }) {
  if (allowDomainMismatch) return null;
  const invitedDomain = String(email || '').split('@')[1]?.toLowerCase() || '';
  const institutionDomain = String(institution.domain || '').toLowerCase();
  if (!institutionDomain) return null; // institution has no domain on file
  if (invitedDomain === institutionDomain) return null;
  return { invitedDomain, institutionDomain };
}

async function inviteSingle({ actor, institution, name, email, allowDomainMismatch }) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedName = (name || '').trim();

  // Domain gate first — cheapest to fail on.
  const mismatch = domainMismatch({
    email: trimmedEmail,
    institution,
    allowDomainMismatch,
  });
  if (mismatch) {
    const err = new Error(
      `Invited email domain (${mismatch.invitedDomain}) does not match institution domain (${mismatch.institutionDomain}). ` +
        'Confirm the invite to override, or use an institutional email.',
    );
    err.code = 'DOMAIN_MISMATCH';
    err.status = 409;
    err.meta = mismatch;
    throw err;
  }

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
    // Attach and re-issue token. Verification stays PENDING until the
    // invitee claims the account via the emailed onboarding link — that
    // step confirms the invite reached the real person (CA-01 requirement).
    existing.institutionId = institution._id;
    existing.verificationStatus = 'pending';
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
  // Verification starts as PENDING; onboarding.service flips it to
  // 'verified' once the invitee sets their password via the token link.
  const doc = await Faculty.create({
    name: trimmedName || trimmedEmail.split('@')[0],
    email: trimmedEmail,
    role: 'Faculty',
    institutionId: institution._id,
    invitedByFacultyId: actor._id,
    invitedAt: new Date(),
    verificationStatus: 'pending',
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

export async function inviteOneByActor(actorId, { name, email, allowDomainMismatch }) {
  const { actor, institution } = await resolveActorInstitution(actorId);
  return inviteSingle({ actor, institution, name, email, allowDomainMismatch });
}

export async function inviteBulkByActor(actorId, entries, { allowDomainMismatch } = {}) {
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
      const r = await inviteSingle({
        actor,
        institution,
        name,
        email,
        allowDomainMismatch,
      });
      results.push(r);
    } catch (err) {
      // In bulk mode a DOMAIN_MISMATCH row becomes a per-row skip rather
      // than aborting the batch — admin sees them all at once and can
      // re-post with allowDomainMismatch=true for the ones they meant.
      if (err.code === 'DOMAIN_MISMATCH') {
        results.push({
          status: 'skipped',
          reason: 'domain_mismatch',
          email,
          invitedDomain: err.meta?.invitedDomain,
          institutionDomain: err.meta?.institutionDomain,
        });
        continue;
      }
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
    domainMismatched: results.filter(
      r => r.status === 'skipped' && r.reason === 'domain_mismatch',
    ).length,
    errors: results.filter(r => r.status === 'error').length,
  };
  logger.info('bulk invite summary', { ...summary, institutionId: institution._id.toString() });
  return { summary, results };
}

/**
 * Offboard a roster member. Two paths:
 *   - `purge=true` + unclaimed account → hard-delete the placeholder
 *     Faculty doc. Cleans up test invites (like qa-noreply@example.com)
 *     and invites sent to wrong addresses that never got claimed.
 *   - Any other case → detach institutionId + set verificationStatus
 *     back to pending. Preserves the account so a leaver's own history
 *     stays intact and they can log in from another institution later.
 *
 * Admin can only offboard members of THEIR institution. Guarded by
 * matching institutionId. Cannot offboard themselves (self-lockout).
 */
export async function offboardFacultyByActor(actorId, facultyId, { purge = false } = {}) {
  const { actor, institution } = await resolveActorInstitution(actorId);
  if (actorId === facultyId) {
    const err = new Error('You cannot offboard yourself');
    err.code = 'CANNOT_OFFBOARD_SELF';
    err.status = 400;
    throw err;
  }
  const target = await Faculty.findOne({
    _id: facultyId,
    institutionId: institution._id,
  });
  if (!target) {
    const err = new Error('Faculty not found at your institution');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  // A college admin cannot offboard another college admin via this route
  // — that's a platform-admin call. Prevents lateral escalation removal.
  if (target.role !== 'Faculty') {
    const err = new Error('Only Faculty roles can be offboarded from this route');
    err.code = 'ROLE_NOT_ALLOWED';
    err.status = 400;
    throw err;
  }

  const canPurge = purge && !target.passwordHash;
  if (canPurge) {
    await target.deleteOne();
    logger.info('faculty purged (unclaimed invite)', {
      facultyId,
      institutionId: institution._id.toString(),
      by: actorId,
    });
    return { offboarded: true, purged: true, facultyId };
  }
  target.institutionId = null;
  target.verificationStatus = 'pending';
  target.invitedByFacultyId = null;
  target.invitedAt = null;
  target.onboardingTokenHash = null;
  target.onboardingTokenExpires = null;
  await target.save();
  logger.info('faculty offboarded (detached)', {
    facultyId,
    institutionId: institution._id.toString(),
    by: actorId,
  });
  return { offboarded: true, purged: false, facultyId };
}
