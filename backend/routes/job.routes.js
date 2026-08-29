import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createHandler,
  listHandler,
  detailHandler,
  applyHandler,
  listApplicantsHandler,
  updateApplicationStatusHandler,
  listMyApplicationsHandler,
  listMyPostingsHandler,
  setJobStatusHandler,
} from '../controllers/job.controller.js';

const router = Router();

router.get('/', listHandler);
router.get('/mine/applications', authenticate, listMyApplicationsHandler);
router.get(
  '/mine/postings',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  listMyPostingsHandler,
);
router.get('/:id', detailHandler);
router.post('/', authenticate, requireRole('CollegeAdmin', 'PlatformAdmin'), createHandler);
router.post('/:id/apply', authenticate, requireRole('Faculty', 'CollegeAdmin'), applyHandler);
router.patch(
  '/:id/status',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  setJobStatusHandler,
);
router.get(
  '/:id/applicants',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  listApplicantsHandler,
);
router.patch(
  '/:id/applicants/:appId',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  updateApplicationStatusHandler,
);

export default router;
