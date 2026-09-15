import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
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
router.patch('/:id/read', validateParams(objectIdParamSchema), markReadHandler);
router.post('/mark-all-read', markAllReadHandler);

export default router;
