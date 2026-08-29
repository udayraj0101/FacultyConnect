import { Router } from 'express';
import { verifyIssnHandler } from '../controllers/verification.controller.js';

const router = Router();

router.get('/verify', verifyIssnHandler);

export default router;
