import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
import {
  listVerificationsHandler,
  reviewVerificationHandler,
} from '../controllers/admin.controller.js';
import { platformOverviewHandler } from '../controllers/stats.controller.js';
import {
  listForAdminHandler as listReportsForAdminHandler,
  reviewHandler as reviewReportHandler,
  summaryHandler as reportsSummaryHandler,
} from '../controllers/report.controller.js';

const router = Router();

router.use(authenticate, requireRole('PlatformAdmin'));

router.get('/overview', platformOverviewHandler);
router.get('/verifications', listVerificationsHandler);
router.patch('/verifications/:id', validateParams(objectIdParamSchema), reviewVerificationHandler);

router.get('/reports', listReportsForAdminHandler);
router.patch('/reports/:id', validateParams(objectIdParamSchema), reviewReportHandler);
router.get('/reports-summary', reportsSummaryHandler);

export default router;
