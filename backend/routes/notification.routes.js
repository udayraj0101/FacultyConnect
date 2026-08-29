import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listHandler,
  summaryHandler,
  markReadHandler,
  markAllReadHandler,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listHandler);
router.get('/summary', summaryHandler);
router.patch('/:id/read', markReadHandler);
router.post('/mark-all-read', markAllReadHandler);

export default router;
