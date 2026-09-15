import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.js';
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

router.get('/search', searchLimiter, searchHandler);
router.get('/faculty/:id', validateParams(objectIdParamSchema), profileHandler);

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

router.get('/connect-requests', listConnectRequestsHandler);
router.post('/connect-requests', sendLimiter, createConnectRequestHandler);
router.patch('/connect-requests/:id', validateParams(objectIdParamSchema), respondConnectRequestHandler);
router.get('/connect-requests-summary', connectRequestSummaryHandler);
router.get('/connections', myNetworkHandler);

export default router;
