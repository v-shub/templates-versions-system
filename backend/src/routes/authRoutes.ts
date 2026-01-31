import { Router } from 'express';
import * as AuthController from '../controllers/AuthController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', protect, AuthController.me);

export default router;
