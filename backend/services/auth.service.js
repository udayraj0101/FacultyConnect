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

export async function signup({ name, email, password, designation, institutionId }) {
  const existing = await Faculty.findOne({ email });
  if (existing) {
    const err = new Error('Email already registered');
    err.code = 'EMAIL_TAKEN';
    err.status = 409;
    throw err;
  }
  // If the signup includes an institution, the account starts as PENDING
  // — the college admin at that institution must approve it. Signups
  // without an institution get created verified (no one to approve them).
  let resolvedInstitutionId = null;
  let verificationStatus = 'verified';
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
    verificationStatus = 'pending';
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
