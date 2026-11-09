import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth.service');

const BCRYPT_ROUNDS = 12;

function signAccessToken(faculty) {
  return jwt.sign(
    { id: faculty._id.toString(), role: faculty.role, email: faculty.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
  );
}

function signRefreshToken(faculty) {
  return jwt.sign(
    { id: faculty._id.toString(), type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_TTL || '30d' },
  );
}

async function issueTokens(faculty) {
  const accessToken = signAccessToken(faculty);
  const refreshToken = signRefreshToken(faculty);
  faculty.refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
  faculty.lastLogin = new Date();
  await faculty.save();
  return { accessToken, refreshToken };
}

// Bumping this string invalidates any assumption of prior consent —
// use it when the privacy policy materially changes so we can prompt
// users to re-accept. Kept in this file rather than a shared config
// because signup + onboarding are the only current writers.
const CURRENT_POLICY_VERSION = '2026-01-dpdp-v1';

export async function signup({ name, email, password, designation, institutionId, consent }) {
  const existing = await Faculty.findOne({ email });
  if (existing) {
    const err = new Error('Email already registered');
    err.code = 'EMAIL_TAKEN';
    err.status = 409;
    throw err;
  }
  // Every new account starts as PENDING. QA report Oct 2026 flagged a
  // trust-boundary bug — unaffiliated accounts (example.edu, personal
  // email, no institution) were being auto-verified, which let them
  // appear in Directory search + send connect requests + apply to jobs
  // as a "confirmed identity". Now:
  //   - with institutionId → pending (College Admin at that institution
  //     approves them, same as before)
  //   - without institutionId → still pending (Platform Admin reviews +
  //     flips to verified after a document check)
  // Routes that mint trust (directory search results, connect-request
  // send, job apply) already gate on verificationStatus === 'verified'
  // via requireVerifiedFaculty middleware (or will, per #6 of the QA
  // report — see the related guard commit).
  let resolvedInstitutionId = null;
  const verificationStatus = 'pending';
  if (institutionId) {
    if (!mongoose.isValidObjectId(institutionId)) {
      const err = new Error('Invalid institution');
      err.code = 'INVALID_INSTITUTION';
      err.status = 400;
      throw err;
    }
    const inst = await Institution.findById(institutionId).select('_id verificationStatus');
    if (!inst) {
      const err = new Error('Institution not found');
      err.code = 'INSTITUTION_NOT_FOUND';
      err.status = 400;
      throw err;
    }
    resolvedInstitutionId = inst._id;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const faculty = await Faculty.create({
    name,
    email,
    passwordHash,
    designation: designation || 'Assistant',
    role: 'Faculty',
    institutionId: resolvedInstitutionId,
    verificationStatus,
    // Zod schema at the API boundary guarantees consent === true, but we
    // only stamp the timestamp when the flag actually arrived so we
    // don't lie in the audit trail if a future path skips validation.
    consentAcceptedAt: consent === true ? new Date() : null,
    consentPolicyVersion: consent === true ? CURRENT_POLICY_VERSION : null,
  });
  logger.info('faculty signed up', {
    facultyId: faculty._id.toString(),
    institutionId: resolvedInstitutionId?.toString() || null,
    verificationStatus,
  });
  const tokens = await issueTokens(faculty);
  return { faculty: faculty.toPublicJSON(), ...tokens };
}

export async function login({ email, password }) {
  const faculty = await Faculty.findOne({ email });
  if (!faculty) {
    const err = new Error('Invalid email or password');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }
  if (!faculty.passwordHash) {
    // Invited-only account — user hasn't set a password yet. Return a
    // specific code so the login page can point them at the onboarding
    // flow (or offer a resend). Distinct from INVALID_CREDENTIALS.
    const err = new Error(
      'This account was invited but not yet activated. Check your email for the onboarding link.',
    );
    err.code = 'ONBOARDING_PENDING';
    err.status = 403;
    throw err;
  }
  const ok = await bcrypt.compare(password, faculty.passwordHash);
  if (!ok) {
    logger.warn('login password mismatch', { email });
    const err = new Error('Invalid email or password');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }
  const tokens = await issueTokens(faculty);
  logger.info('faculty logged in', { facultyId: faculty._id.toString() });
  return { faculty: faculty.toPublicJSON(), ...tokens };
}

/**
 * Server-side revocation for the httpOnly refresh cookie. Silently
 * succeeds when the token is unrecognized so /logout stays idempotent
 * — a stale or double-tap logout should not surface an error to the
 * client. Any code path that discovers a token is bad simply drops it.
 */
export async function revokeRefreshToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return;
  }
  if (payload.type !== 'refresh') return;
  const faculty = await Faculty.findById(payload.id);
  if (!faculty) return;
  faculty.refreshTokenHash = null;
  await faculty.save();
  logger.info('refresh token revoked', { facultyId: faculty._id.toString() });
}

export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    const err = new Error('Invalid or expired refresh token');
    err.code = 'REFRESH_INVALID';
    err.status = 401;
    throw err;
  }
  if (payload.type !== 'refresh') {
    const err = new Error('Wrong token type');
    err.code = 'REFRESH_INVALID';
    err.status = 401;
    throw err;
  }
  const faculty = await Faculty.findById(payload.id);
  if (!faculty || !faculty.refreshTokenHash) {
    const err = new Error('Session no longer valid');
    err.code = 'REFRESH_INVALID';
    err.status = 401;
    throw err;
  }
  const matches = await bcrypt.compare(refreshToken, faculty.refreshTokenHash);
  if (!matches) {
    logger.warn('refresh token mismatch', { facultyId: faculty._id.toString() });
    const err = new Error('Session no longer valid');
    err.code = 'REFRESH_INVALID';
    err.status = 401;
    throw err;
  }
  const tokens = await issueTokens(faculty);
  return { faculty: faculty.toPublicJSON(), ...tokens };
}
