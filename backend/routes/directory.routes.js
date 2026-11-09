import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerifiedFaculty } from '../middleware/requireVerifiedFaculty.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
import { searchHandler, profileHandler } from '../controllers/directory.controller.js';
import {
  createHandler as createConnectRequestHandler,
  listHandler as listConnectRequestsHandler,
  respondHandler as respondConnectRequestHandler,
  summaryHandler as connectRequestSummaryHandler,
  networkHandler as myNetworkHandler,
} from '../controllers/connect-request.controller.js';

// Per PRD §3.5 + §8: rate-limit directory search to prevent scraping.
// 60 requests/minute per faculty is generous for real UX but blocks bulk crawls.
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many directory searches — please slow down.',
    },
  },
});

const router = Router();

// All directory routes require authentication — no anonymous browsing.
router.use(authenticate);

// QA #6: directory + individual profile lookup are trust-minting
// surfaces ("this verified person is a real researcher"). Gated on
// verified status — pending accounts can build their own profile but
// can't browse others until a College/Platform Admin approves them.
router.get('/search', requireVerifiedFaculty, searchLimiter, searchHandler);
router.get(
  '/faculty/:id',
  requireVerifiedFaculty,
  validateParams(objectIdParamSchema),
  profileHandler,
);

// Connect requests — PRD §5.6. Sender-side burst limit as a first defense;
// the service also enforces a 10/day count against the DB.
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many connect requests in a short window — slow down.',
    },
  },
});

// List + respond + summary are safe for pending accounts — they just
// read / respond to what came in. Only the outbound SEND is gated so
// unverified accounts can't cold-outreach the roster.
router.get('/connect-requests', listConnectRequestsHandler);
router.post(
  '/connect-requests',
  requireVerifiedFaculty,
  sendLimiter,
  createConnectRequestHandler,
);
router.patch('/connect-requests/:id', validateParams(objectIdParamSchema), respondConnectRequestHandler);
router.get('/connect-requests-summary', connectRequestSummaryHandler);
router.get('/connections', myNetworkHandler);

export default router;
