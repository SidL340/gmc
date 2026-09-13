import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  sendOTP,
  verifyOTPAndLogin,
  completeRegistration,
  refreshTokens,
  logout,
  logoutAll,
  getMe,
  adminLogin,
  googleAuth,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Strict rate limit for OTP requests in production
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: { success: false, message: 'Too many OTP requests. Try again in 15 minutes.' },
  keyGenerator: (req) => req.body?.phone || req.ip || 'unknown',
});

// Auth routes
router.post('/google',                            googleAuth);
router.post('/send-otp',              otpLimiter, sendOTP);
router.post('/verify-otp',            otpLimiter, verifyOTPAndLogin);
router.post('/complete-registration',             completeRegistration);
router.post('/register',                              completeRegistration);
router.post('/refresh',                           refreshTokens);
router.post('/logout',                            logout);
router.post('/logout-all',            authenticate, logoutAll);
router.get ('/me',                    authenticate, getMe);

// Admin login (OTP-based)
router.post('/admin/send-otp',        otpLimiter, sendOTP);        // reuse same endpoint
router.post('/admin/login',           otpLimiter, adminLogin);

export default router;
