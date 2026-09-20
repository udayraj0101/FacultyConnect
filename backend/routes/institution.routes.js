import { Router } from 'express';
import { createHandler, listHandler, detailHandler } from '../controllers/institution.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
import {
  inviteHandler,
  bulkInviteHandler,
  listFacultyHandler,
  pendingFacultyHandler,
  approveHandler,
  rejectHandler,
  offboardHandler,
} from '../controllers/institution-admin.controller.js';

const router = Router();

router.get('/', listHandler);
router.post('/', createHandler);
router.get('/:id', validateParams(objectIdParamSchema), detailHandler);

// -----------------------------------------------------------------
// College Admin faculty roster management. All scoped implicitly to
// the actor's institutionId — no institutionId in the URL, on purpose.
// -----------------------------------------------------------------
router.post(
  '/faculty/invite',
  authenticate,
  requireRole('CollegeAdmin'),
  inviteHandler,
);
router.post(
  '/faculty/bulk-invite',
  authenticate,
  requireRole('CollegeAdmin'),
  bulkInviteHandler,
);
router.get(
  '/faculty/roster',
  authenticate,
  requireRole('CollegeAdmin'),
  listFacultyHandler,
);
router.get(
  '/faculty/pending',
  authenticate,
  requireRole('CollegeAdmin'),
  pendingFacultyHandler,
);
router.patch(
  '/faculty/:id/approve',
  authenticate,
  requireRole('CollegeAdmin'),
  validateParams(objectIdParamSchema),
  approveHandler,
);
router.patch(
  '/faculty/:id/reject',
  authenticate,
  requireRole('CollegeAdmin'),
  validateParams(objectIdParamSchema),
  rejectHandler,
);
// CA-01 offboarding — revoke an unclaimed invite (body.purge=true) or
// detach a claimed roster member (body.purge omitted / false).
router.delete(
  '/faculty/:id',
  authenticate,
  requireRole('CollegeAdmin'),
  validateParams(objectIdParamSchema),
  offboardHandler,
);

export default router;
