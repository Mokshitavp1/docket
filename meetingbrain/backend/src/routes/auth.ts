import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  getNotifications,
  markNotificationsRead,
  deleteAccount,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} from '../utils/validators';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/refresh', refreshToken);

// ─── Protected routes ─────────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.post('/change-password', authenticate, changePasswordValidator, changePassword);
router.delete('/me', authenticate, deleteAccount);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/read', authenticate, markNotificationsRead);

export default router;