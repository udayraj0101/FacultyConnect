import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Faculty } from '../models/Faculty.js';
import { sendPasswordResetEmail } from './email.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('password-reset');

const BCRYPT_ROUNDS = 12;
// One hour is a common industry default. Long enough for a user to check
// their email + click through, short enough to bound exposure if the mail
// account is later compromised.
const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Request a password reset. Silent on whether the email exists —
 * per OWASP guidance, the response is the same in both cases so an
 * attacker can't enumerate registered accounts by watching status
 * codes or response times.
 *
 * Returns void; the caller should always respond 200 to the client.
 */
export async function requestReset({ email }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return;

  const faculty = await Faculty.findOne({ email: normalizedEmail });
  if (!faculty) {
    // Deliberately timing-agnostic: we still do work (an unhashed compare
    // burn) so the response time doesn't leak account existence. Cheap.
    await bcrypt.hash(crypto.randomBytes(16).toString('hex'), BCRYPT_ROUNDS);
    logger.info('reset requested for unknown email', { email: normalizedEmail });
    return;
  }

  // Placeholder / invited-only accounts don't have a password yet — send
  // them to onboarding instead of pretending to reset a password that
  // doesn't exist. We still email so the user learns what to do.
  if (!faculty.passwordHash) {
    logger.info('reset requested for invited-only account', {
      facultyId: faculty._id.toString(),
    });
    return; // Don't leak state; the "if we found your account, we sent an
            // email" response covers this case too. Onboarding email was
            // already sent when the admin invited them.
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const hash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  faculty.passwordResetTokenHash = hash;
  faculty.passwordResetTokenExpires = new Date(Date.now() + TOKEN_TTL_MS);
  await faculty.save();

  // Composite `facultyId.rawToken` matches the onboarding pattern — lets
  // us look up the account in constant time without scanning every hash.
  const compositeToken = `${faculty._id.toString()}.${rawToken}`;

  // Fire-and-forget. If SMTP is down, the user just doesn't get the email;
  // we shouldn't fail the API call because email delivery flaked.
  sendPasswordResetEmail({
    toEmail: faculty.email,
    toName: faculty.name,
    token: compositeToken,
  }).catch(err =>
    logger.warn('reset email send failed', {
      facultyId: faculty._id.toString(),
      error: err.message,
    }),
  );

  logger.info('password reset requested', { facultyId: faculty._id.toString() });
}

/**
 * Look up + validate a composite reset token. Returns the Faculty doc
 * on success. Throws a generic 400 on any failure — no distinction
 * between "no such account" / "expired" / "already used" so we don't
 * help attackers narrow their guessing.
 */
async function verifyToken(compositeToken) {
  const invalid = () => {
    const err = new Error('This reset link is invalid or has expired.');
    err.code = 'INVALID_TOKEN';
    err.status = 400;
    return err;
  };
  if (typeof compositeToken !== 'string') throw invalid();
  const dot = compositeToken.indexOf('.');
  if (dot < 24) throw invalid();
  const facultyId = compositeToken.slice(0, dot);
  const rawToken = compositeToken.slice(dot + 1);
  if (!facultyId || !rawToken) throw invalid();

  const faculty = await Faculty.findById(facultyId);
  if (!faculty || !faculty.passwordResetTokenHash || !faculty.passwordResetTokenExpires) {
    throw invalid();
  }
  if (faculty.passwordResetTokenExpires.getTime() < Date.now()) throw invalid();

  const ok = await bcrypt.compare(rawToken, faculty.passwordResetTokenHash);
  if (!ok) throw invalid();

  return faculty;
}

/**
 * Preview endpoint for the /reset-password/:token landing page. Confirms
 * the token is valid and returns just enough for the UI to greet the user
 * (email + name). No sensitive fields.
 */
export async function previewReset(compositeToken) {
  const faculty = await verifyToken(compositeToken);
  return {
    email: faculty.email,
    name: faculty.name,
  };
}

/**
 * Complete the reset: hash the new password, revoke any outstanding
 * refresh tokens so old sessions can't ride the old credential, and
 * clear the reset token so the link can't be reused.
 */
export async function completeReset(compositeToken, { password }) {
  const faculty = await verifyToken(compositeToken);
  faculty.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  faculty.passwordResetTokenHash = null;
  faculty.passwordResetTokenExpires = null;
  // Kill any active sessions — a password reset is often triggered by
  // "someone might have access to my account". Force them to sign in
  // again with the new password.
  faculty.refreshTokenHash = null;
  await faculty.save();
  logger.info('password reset completed', { facultyId: faculty._id.toString() });
  return faculty;
}
