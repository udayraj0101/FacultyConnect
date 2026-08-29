import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';
import * as orcidService from '../services/orcid.service.js';
import * as facultyService from '../services/faculty.service.js';
import * as onboardingService from '../services/onboarding.service.js';
import { completeOnboardingSchema } from '../schemas/auth.schema.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth.controller');

export async function signupHandler(req, res) {
  try {
    const result = await authService.signup(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'SIGNUP_FAILED', message: error.message },
    });
  }
}

export async function loginHandler(req, res) {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LOGIN_FAILED', message: error.message },
    });
  }
}

export async function refreshHandler(req, res) {
  try {
    const result = await authService.refresh(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'REFRESH_FAILED', message: error.message },
    });
  }
}

export async function orcidRedirectHandler(req, res) {
  try {
    const state = orcidService.signState(req.user.id);
    const authorizeUrl = orcidService.buildAuthorizeUrl(state);
    return res.status(200).json({ authorizeUrl });
  } catch (error) {
    logger.error('orcid redirect failed', { error: error.message });
    return res.status(error.status || 500).json({
      error: { code: error.code || 'ORCID_REDIRECT_FAILED', message: error.message },
    });
  }
}

function frontendRedirect(res, params) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const query = new URLSearchParams(params).toString();
  return res.redirect(`${base}/profile?${query}`);
}

export async function onboardingPreviewHandler(req, res) {
  try {
    const preview = await onboardingService.previewInvitation(req.params.token);
    return res.status(200).json(preview);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'PREVIEW_FAILED', message: error.message },
    });
  }
}

export async function onboardingCompleteHandler(req, res) {
  const parsed = completeOnboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details },
    });
  }
  try {
    const faculty = await onboardingService.completeOnboarding(req.params.token, parsed.data);
    // Issue tokens so the user is logged in immediately after claiming.
    const accessToken = jwt.sign(
      { id: faculty._id.toString(), role: faculty.role, email: faculty.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
    );
    const refreshToken = jwt.sign(
      { id: faculty._id.toString(), type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_TTL || '30d' },
    );
    faculty.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    faculty.lastLogin = new Date();
    await faculty.save();
    return res.status(200).json({
      faculty: faculty.toPublicJSON(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'ONBOARDING_FAILED', message: error.message },
    });
  }
}

export async function orcidCallbackHandler(req, res) {
  const { code, state, error: orcidError, error_description } = req.query;

  if (orcidError) {
    logger.warn('orcid denied', { orcidError, description: error_description });
    return frontendRedirect(res, { orcidError: orcidError, orcidMessage: error_description || 'ORCID authorization denied' });
  }
  if (!code || !state) {
    return frontendRedirect(res, { orcidError: 'MISSING_PARAMS', orcidMessage: 'Missing code or state' });
  }

  try {
    const { facultyId } = orcidService.verifyState(state);
    const tokenResponse = await orcidService.exchangeCodeForToken(code);
    const orcidId = tokenResponse.orcid;
    if (!orcidId) {
      throw Object.assign(new Error('ORCID iD missing from token response'), {
        code: 'ORCID_ID_MISSING',
        status: 502,
      });
    }
    await facultyService.linkOrcid(facultyId, orcidId);
    logger.info('orcid linked', { facultyId, orcidId });
    return frontendRedirect(res, { orcidLinked: 'true', orcidId });
  } catch (error) {
    logger.warn('orcid callback failed', { error: error.message, code: error.code });
    return frontendRedirect(res, {
      orcidError: error.code || 'ORCID_LINK_FAILED',
      orcidMessage: error.message,
    });
  }
}
