import { Router } from 'express';
import * as AuthController from '../controllers/AuthController';
import { protect } from '../middleware/auth';
import {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
} from '../middleware/validators';

const router = Router();

router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.get('/me', protect, AuthController.me);
router.patch('/me', protect, validateUpdateProfile, AuthController.updateProfile);
router.post('/me/password', protect, validateChangePassword, AuthController.changePassword);

export default router;
