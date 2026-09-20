import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateParams, objectIdParamSchema } from '../middleware/validate.js';
import {
  createHandler,
  listHandler,
  updateHandler,
  deleteHandler,
  runHandler,
} from '../controllers/savedSearch.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listHandler);
router.post('/', createHandler);
router.patch('/:id', validateParams(objectIdParamSchema), updateHandler);
router.delete('/:id', validateParams(objectIdParamSchema), deleteHandler);
router.get('/:id/results', validateParams(objectIdParamSchema), runHandler);

export default router;
