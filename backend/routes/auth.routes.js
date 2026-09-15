import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.js';
import { signupSchema, loginSchema } from '../schemas/auth.schema.js';
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  orcidRedirectHandler,
  orcidCallbackHandler,
  onboardingPreviewHandler,
  onboardingCompleteHandler,
} from '../controllers/auth.controller.js';

// FC-01: brute-force protection on auth routes. Two layers so an attacker
// can't sidestep either dimension:
//   - per-IP throttles a single machine hammering many accounts
//   - per-account throttles a distributed attempt against one account
// Both use the same 429 shape as the existing directory limiters so the
// frontend can handle them uniformly.
const rateLimitedResponse = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many attempts — please wait a few minutes and try again.',
  },
};

const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse,
});

// Keying the account-scoped limiter off the body's email means credential
// stuffing across many IPs still trips the same bucket for a targeted
// account. Falls back to req.ip when the body is missing/malformed so a
// zod-rejected payload can't be used to bypass the counter entirely.
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // ipKeyGenerator normalizes IPv6 into a /64 subnet — without it a single
  // IPv6 user could rotate the low 64 bits and bypass the per-IP fallback.
  keyGenerator: (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email || ipKeyGenerator(req, res);
  },
  message: rateLimitedResponse,
});

const router = Router();

router.post('/signup', authIpLimiter, validateBody(signupSchema), signupHandler);
router.post(
  '/login',
  authIpLimiter,
  loginAccountLimiter,
  validateBody(loginSchema),
  loginHandler,
);
// /refresh reads the httpOnly cookie the previous login/signup set, so
// there's no body to validate. Rate limited to blunt refresh-loop abuse.
router.post('/refresh', authIpLimiter, refreshHandler);
// /logout is idempotent and read-only from the client's POV, but we keep
// it a POST so browser prefetchers and crawlers don't accidentally sign
// users out.
router.post('/logout', logoutHandler);

router.get('/orcid/redirect', authenticate, orcidRedirectHandler);
router.get('/orcid/callback', orcidCallbackHandler);

// Public onboarding endpoints — token in the URL is the auth.
router.get('/onboarding/:token', onboardingPreviewHandler);
router.post('/onboarding/:token/complete', onboardingCompleteHandler);

export default router;
