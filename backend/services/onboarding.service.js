import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Faculty } from '../models/Faculty.js';
import { notify } from './notification.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('onboarding');

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days per invite email copy

/**
 * Generate a raw + hashed onboarding token. We store only the hash on
 * the Faculty doc; the raw token is emailed to the user and never
 * persisted server-side (same pattern as refreshTokenHash).
 */
export async function issueOnboardingToken(facultyId) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const hash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  await Faculty.updateOne(
    { _id: facultyId },
    {
      onboardingTokenHash: hash,
      onboardingTokenExpires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  );
  // We prepend the facultyId to the raw token (URL-safe) so we can find
  // the matching account in constant time, without needing to scan every
  // faculty's bcrypt hash on the /onboarding/:token endpoint.
  return `${facultyId.toString()}.${rawToken}`;
}

/**
 * Resolve a token from the URL. Returns the Faculty doc if valid + not
 * expired, otherwise throws with a generic error (no distinction between
 * "wrong faculty" / "expired" / "already claimed" — avoids enumeration).
 */
async function verifyToken(compositeToken) {
  const err = () => {
    const e = new Error('Invitation link is invalid or has expired');
    e.code = 'INVALID_TOKEN';
    e.status = 400;
    return e;
  };
  if (typeof compositeToken !== 'string') throw err();
  const dot = compositeToken.indexOf('.');
  if (dot < 24) throw err();
  const facultyId = compositeToken.slice(0, dot);
  const rawToken = compositeToken.slice(dot + 1);
  if (!facultyId || !rawToken) throw err();

  const faculty = await Faculty.findById(facultyId).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!faculty || !faculty.onboardingTokenHash || !faculty.onboardingTokenExpires) throw err();
  if (faculty.onboardingTokenExpires.getTime() < Date.now()) throw err();

  const ok = await bcrypt.compare(rawToken, faculty.onboardingTokenHash);
  if (!ok) throw err();

  return faculty;
}

/**
 * Public preview for the /onboarding/:token landing page. Reveals just
 * enough for the user to recognise the invitation — no sensitive data.
 */
export async function previewInvitation(compositeToken) {
  const faculty = await verifyToken(compositeToken);
  return {
    email: faculty.email,
    name: faculty.name,
    institution: faculty.institutionId
      ? { id: faculty.institutionId._id.toString(), name: faculty.institutionId.name }
      : null,
    invitedAt: faculty.invitedAt,
  };
}

/**
 * Complete onboarding: hash the chosen password, mark the account as
 * verified (invited-in accounts are pre-approved — the college admin
 * vouched by adding them), and clear the token.
 */
export async function completeOnboarding(compositeToken, { password }) {
  const faculty = await verifyToken(compositeToken);
  const invitedByFacultyId = faculty.invitedByFacultyId;
  faculty.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  faculty.onboardingTokenHash = null;
  faculty.onboardingTokenExpires = null;
  // Invited faculty are pre-verified — college admin vouched for them.
  faculty.verificationStatus = 'verified';
  await faculty.save();
  logger.info('onboarding completed', { facultyId: faculty._id.toString() });

  // Notify the college admin who sent the invite (if any). Look up the
  // inviter so notify() has an email + name to work with even though this
  // notification type is currently in-app-only.
  if (invitedByFacultyId) {
    const inviter = await Faculty.findById(invitedByFacultyId).select('name email');
    if (inviter) {
      notify(inviter, 'invitation_accepted', {
        facultyName: faculty.name,
        facultyId: faculty._id.toString(),
      }).catch(err => logger.warn('invitation_accepted notify failed', { error: err.message }));
    }
  }

  return faculty;
}
