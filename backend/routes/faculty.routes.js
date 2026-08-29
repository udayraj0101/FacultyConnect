import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.js';
import {
  updateFacultySchema,
  visibilitySchema,
  publicProfileSchema,
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
router.delete('/me/publications/:id', deletePublicationHandler);
router.post('/me/import/orcid', importOrcidWorksHandler);
router.post('/me/publications/enrich-crossref', enrichCrossrefHandler);
router.post('/me/import/scopus', importScopusHandler);
router.post('/me/import/scholar-csv', importScholarCsvHandler);

router.get('/me/cv/export', exportCvHandler);
router.get('/me/college-overview', collegeOverviewHandler);

export default router;
