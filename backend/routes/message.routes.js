import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
import {
  sendHandler,
  listThreadsHandler,
  listMessagesHandler,
  markReadHandler,
  unreadSummaryHandler,
  openThreadHandler,
} from '../controllers/message.controller.js';

// Modest per-user send rate limit. The domain-level cap (must have an
// accepted ConnectRequest between sender and recipient) is a much
// stronger real-world throttle, but this keeps a bulk-send loop from
// swamping the notification pipeline.
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'You are sending messages too quickly. Slow down a bit.',
    },
  },
});

const router = Router();

router.use(authenticate);

router.get('/threads', listThreadsHandler);
router.get('/unread-summary', unreadSummaryHandler);
router.get('/threads/:id', validateParams(objectIdParamSchema), listMessagesHandler);
router.patch(
  '/threads/:id/read',
  validateParams(objectIdParamSchema),
  markReadHandler,
);
// Open (or create) a thread with a given faculty. Idempotent — safe to
// call from any "Message this person" CTA without checking existence.
router.get('/with/:id', validateParams(objectIdParamSchema), openThreadHandler);
router.post('/', sendLimiter, sendHandler);

export default router;
