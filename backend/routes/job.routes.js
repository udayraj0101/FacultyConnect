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
  updateJobHandler,
  deleteJobHandler,
  getApplicantProfileHandler,
  getApplicantCvHandler,
  saveApplicantReviewHandler,
  bulkStatusHandler,
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
// CA-04 edit + archive. Institution-scoped ownership check lives in the
// service so the same guard covers /status too.
router.patch(
  '/:id',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(objectIdParamSchema),
  updateJobHandler,
);
router.delete(
  '/:id',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(objectIdParamSchema),
  deleteJobHandler,
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
// Admin-scoped applicant review. Ownership check is inside the service;
// both routes reuse the same jobAndApplicantParamSchema for id + appId
// validation.
router.get(
  '/:id/applicants/:appId/profile',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(jobAndApplicantParamSchema),
  getApplicantProfileHandler,
);
router.get(
  '/:id/applicants/:appId/cv',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(jobAndApplicantParamSchema),
  getApplicantCvHandler,
);
router.patch(
  '/:id/applicants/:appId/review',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(jobAndApplicantParamSchema),
  saveApplicantReviewHandler,
);
router.post(
  '/:id/applicants/bulk-status',
  authenticate,
  requireRole('CollegeAdmin', 'PlatformAdmin'),
  validateParams(objectIdParamSchema),
  bulkStatusHandler,
);

export default router;
