import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';
import * as orcidService from '../services/orcid.service.js';
import * as facultyService from '../services/faculty.service.js';
import * as onboardingService from '../services/onboarding.service.js';
import { completeOnboardingSchema } from '../schemas/auth.schema.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth.controller');

// httpOnly refresh-token cookie (FC-06). httpOnly blocks JS reads so an XSS
// payload cannot exfiltrate a long-lived session credential. sameSite=lax
// blocks CSRF on the refresh endpoint while still allowing top-level nav
// after login. Path is scoped to /v1/auth so the cookie only rides the
// small handful of endpoints that need it, keeping every other request
// header-lean. Secure defaults to false because the QA deploy runs plain
// HTTP; flip COOKIE_SECURE=true in the env when TLS is in place.
const REFRESH_COOKIE_NAME = 'fc_refresh';
const REFRESH_COOKIE_PATH = '/v1/auth';
// Cookie lifetime tracks the refresh JWT default (30d). Cookie expiry is
// just the browser retention guard — the JWT's own exp claim is the real
// invariant, so a mismatch here fails closed at verify time.
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  // Passing the same options (minus maxAge) tells the browser to overwrite
  // the existing cookie rather than dropping a second one on a different
  // path scope.
  const { maxAge, ...opts } = refreshCookieOptions();
  void maxAge;
  res.clearCookie(REFRESH_COOKIE_NAME, opts);
}

// Split the { accessToken, refreshToken, faculty } shape returned by the
// service into a JSON body (access token only) and a Set-Cookie header
// (refresh token). Keeps the service transport-agnostic.
function respondWithSession(res, status, { faculty, accessToken, refreshToken }) {
  setRefreshCookie(res, refreshToken);
  return res.status(status).json({ faculty, accessToken });
}

export async function signupHandler(req, res) {
  try {
    const result = await authService.signup(req.body);
    return respondWithSession(res, 201, result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'SIGNUP_FAILED', message: error.message },
    });
  }
}

export async function loginHandler(req, res) {
  try {
    const result = await authService.login(req.body);
    return respondWithSession(res, 200, result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LOGIN_FAILED', message: error.message },
    });
  }
}

export async function refreshHandler(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({
      error: { code: 'REFRESH_INVALID', message: 'No refresh session' },
    });
  }
  try {
    const result = await authService.refresh({ refreshToken });
    return respondWithSession(res, 200, result);
  } catch (error) {
    // On any refresh failure, actively clear the browser cookie so a
    // subsequent request doesn't loop against the same bad token.
    clearRefreshCookie(res);
    return res.status(error.status || 500).json({
      error: { code: error.code || 'REFRESH_FAILED', message: error.message },
    });
  }
}

export async function logoutHandler(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  // Best-effort server-side revocation: if we can verify the token, drop
  // its hash from the Faculty document so a stolen cookie replay fails
  // even before it expires.
  if (refreshToken) {
    try {
      await authService.revokeRefreshToken(refreshToken);
    } catch (error) {
      logger.warn('logout revoke failed', { code: error.code, message: error.message });
    }
  }
  clearRefreshCookie(res);
  return res.status(204).end();
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
  // FRONTEND_URL can be a comma-separated allowlist (see server.js CORS
  // config). For the ORCID callback redirect we just pick the first
  // entry — that's the primary frontend origin.
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const base = raw.split(',')[0].trim();
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
    return respondWithSession(res, 200, {
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
