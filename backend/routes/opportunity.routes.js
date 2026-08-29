import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  listHandler,
  detailHandler,
  bookmarkHandler,
  listBookmarksHandler,
  createHandler,
  listMineHandler,
} from '../controllers/opportunity.controller.js';
import { updateOpportunityVerificationHandler } from '../controllers/verification.controller.js';

const router = Router();

router.get('/', listHandler);
router.get('/mine/bookmarks', authenticate, listBookmarksHandler);
router.get(
  '/mine/postings',
  authenticate,
  requireRole('CollegeAdmin', 'OpportunityOrganizer'),
  listMineHandler,
);
router.post(
  '/',
  authenticate,
  requireRole('CollegeAdmin', 'OpportunityOrganizer'),
  createHandler,
);
router.get('/:id', detailHandler);
router.post('/:id/bookmark', authenticate, bookmarkHandler);
router.patch(
  '/:id/verification',
  authenticate,
  requireRole('PlatformAdmin'),
  updateOpportunityVerificationHandler,
);

export default router;
