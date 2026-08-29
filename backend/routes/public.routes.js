import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { publicProfileHandler } from '../controllers/public.controller.js';

// Public endpoints — no authentication. Rate-limited to blunt scrapers
// per PRD §8. 120 req/min/IP is generous for genuine share/preview
// traffic but blocks bulk enumeration.
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests — please slow down.' },
  },
});

const router = Router();

router.get('/faculty/:id', publicLimiter, publicProfileHandler);

export default router;
