import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
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
router.get('/:id', validateParams(objectIdParamSchema), detailHandler);
router.post('/', authenticate, requireRole('CollegeAdmin', 'PlatformAdmin'), createHandler);
router.post(
  '/:id/apply',
  authenticate,
  requireRole('Faculty', 'CollegeAdmin'),
  validateParams(objectIdParamSchema),
  applyHandler,
);
router.patch(
  '/:id/status',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(objectIdParamSchema),
  setJobStatusHandler,
);
router.get(
  '/:id/applicants',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(objectIdParamSchema),
  listApplicantsHandler,
);
// Nested id + appId path — both must be ObjectIds so we validate them
// together. Deliberately inline: no other route shares this shape.
const jobAndApplicantParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' }),
  appId: z.string().regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' }),
});
router.patch(
  '/:id/applicants/:appId',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(jobAndApplicantParamSchema),
  updateApplicationStatusHandler,
);

export default router;
