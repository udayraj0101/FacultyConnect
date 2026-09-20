import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
import {
  listHandler,
  detailHandler,
  icalHandler,
  bookmarkHandler,
  listBookmarksHandler,
  createHandler,
  listMineHandler,
} from '../controllers/opportunity.controller.js';
import { updateOpportunityVerificationHandler } from '../controllers/verification.controller.js';

const router = Router();

// optionalAuthenticate: list is public, but a logged-in viewer's
// domainTags let the service compute matched-tag chips and support the
// 'domain_match' sort. Anonymous callers get the same list minus
// personalisation.
router.get('/', optionalAuthenticate, listHandler);
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
router.get('/:id', validateParams(objectIdParamSchema), detailHandler);
router.get('/:id/ical', validateParams(objectIdParamSchema), icalHandler);
router.post(
  '/:id/bookmark',
  authenticate,
  validateParams(objectIdParamSchema),
  bookmarkHandler,
);
router.patch(
  '/:id/verification',
  authenticate,
  requireRole('PlatformAdmin'),
  validateParams(objectIdParamSchema),
  updateOpportunityVerificationHandler,
);

export default router;
