import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createHandler,
  listMineHandler,
} from '../controllers/report.controller.js';

// Per PRD §8: reports are rate-limited. 5 reports per 24h per reporter blocks
// abuse but leaves plenty of headroom for a real user flagging predatory
// listings during a browsing session.
const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Daily report limit reached (5). Contact the Grievance Officer for urgent issues.',
    },
  },
});

const router = Router();
router.use(authenticate);

router.post('/', reportLimiter, createHandler);
router.get('/mine', listMineHandler);

export default router;
