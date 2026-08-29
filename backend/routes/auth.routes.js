import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.js';
import { signupSchema, loginSchema, refreshSchema } from '../schemas/auth.schema.js';
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  orcidRedirectHandler,
  orcidCallbackHandler,
  onboardingPreviewHandler,
  onboardingCompleteHandler,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/signup', validateBody(signupSchema), signupHandler);
router.post('/login', validateBody(loginSchema), loginHandler);
router.post('/refresh', validateBody(refreshSchema), refreshHandler);

router.get('/orcid/redirect', authenticate, orcidRedirectHandler);
router.get('/orcid/callback', orcidCallbackHandler);

// Public onboarding endpoints — token in the URL is the auth.
router.get('/onboarding/:token', onboardingPreviewHandler);
router.post('/onboarding/:token/complete', onboardingCompleteHandler);

export default router;
