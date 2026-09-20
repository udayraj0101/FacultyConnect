import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, objectIdParamSchema } from '../middleware/validate.js';
import {
  updateFacultySchema,
  visibilitySchema,
  publicProfileSchema,
  casManualInputsSchema,
} from '../schemas/faculty.schema.js';
import {
  getMeHandler,
  updateMeHandler,
  setVisibilityHandler,
  setPublicProfileHandler,
} from '../controllers/faculty.controller.js';
import {
  listMyPublicationsHandler,
  importOrcidWorksHandler,
  enrichCrossrefHandler,
  importScopusHandler,
  importScholarCsvHandler,
  addManualPublicationHandler,
  deletePublicationHandler,
} from '../controllers/publication.controller.js';
import { exportCvHandler } from '../controllers/cv.controller.js';
import { collegeOverviewHandler } from '../controllers/stats.controller.js';
import {
  getCasScoreHandler,
  updateCasManualInputsHandler,
} from '../controllers/cas.controller.js';

const router = Router();

router.use(authenticate);

router.get('/me', getMeHandler);
router.patch('/me', validateBody(updateFacultySchema), updateMeHandler);
router.patch('/me/visibility', validateBody(visibilitySchema), setVisibilityHandler);
router.patch(
  '/me/public-profile',
  validateBody(publicProfileSchema),
  setPublicProfileHandler,
);

router.get('/me/publications', listMyPublicationsHandler);
router.post('/me/publications', addManualPublicationHandler);
router.delete(
  '/me/publications/:id',
  validateParams(objectIdParamSchema),
  deletePublicationHandler,
);
router.post('/me/import/orcid', importOrcidWorksHandler);
router.post('/me/publications/enrich-crossref', enrichCrossrefHandler);
router.post('/me/import/scopus', importScopusHandler);
router.post('/me/import/scholar-csv', importScholarCsvHandler);

router.get('/me/cv/export', exportCvHandler);
router.get('/me/college-overview', collegeOverviewHandler);

// UGC 2018 CAS Research Score (Wave 12). GET auto-computes from stored
// profile data + saved manual counters. PATCH persists a partial update
// to the manual counters and returns the recomputed score in one round-trip.
router.get('/me/cas-score', getCasScoreHandler);
router.patch(
  '/me/cas-score/manual',
  validateBody(casManualInputsSchema),
  updateCasManualInputsHandler,
);

export default router;
