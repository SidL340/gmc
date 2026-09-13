import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { isValidNepalPhone, sendOTPSMS } from '../services/sms.service';
import {
  generateOTP,
  storeOTP,
  verifyOTP,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  rotateTokens,
  verifyRefreshToken,
} from '../services/auth.service';

// ── Rate-limit OTP requests in memory (production: use Redis) ─────────────────
const otpRequestTracker = new Map<string, { count: number; resetAt: number }>();

const canRequestOTP = (identifier: string): boolean => {
  if (process.env.NODE_ENV !== 'production') return true;
  const now  = Date.now();
  const entry = otpRequestTracker.get(identifier);
  if (!entry || entry.resetAt < now) {
    otpRequestTracker.set(identifier, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false; // max 3 OTPs per minute
  entry.count++;
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// Body: { phone: "98XXXXXXXX" }
// ─────────────────────────────────────────────────────────────────────────────
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;

  if (!phone) throw new AppError('Phone number is required.', 400);
  if (!isValidNepalPhone(phone)) {
    throw new AppError('Please enter a valid Nepali mobile number (e.g. 98XXXXXXXX).', 400);
  }

  if (!canRequestOTP(phone)) {
    throw new AppError('Too many OTP requests. Please wait 1 minute.', 429);
  }

  const otp = generateOTP();
  await storeOTP(phone, 'phone', otp);

  const sent = await sendOTPSMS(phone, otp);
  if (!sent && process.env.NODE_ENV === 'production') {
    throw new AppError('Failed to send OTP. Please try again.', 500);
  }

  res.json({
    success: true,
    message: `OTP sent to ${phone}. Valid for 10 minutes.`,
    // Dev only — NEVER expose OTP in production
    ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Body: { phone, otp, name? }
// Creates account if new user, logs in if existing
// ─────────────────────────────────────────────────────────────────────────────
export const verifyOTPAndLogin = async (req: Request, res: Response): Promise<void> => {
  const { phone, name } = req.body;
  const otp = req.body.otp || req.body.code;

  if (!phone || !otp) throw new AppError('Phone and OTP are required.', 400);
  if (!isValidNepalPhone(phone)) throw new AppError('Invalid phone number.', 400);
  if (!/^\d{6}$/.test(otp))     throw new AppError('OTP must be 6 digits.', 400);

  // Verify OTP (throws if invalid/expired)
  await verifyOTP(phone, 'phone', otp);

  // Find or create user
  let user = await prisma.user.findUnique({ where: { phone } });
  const isNewUser = !user;

  if (!user) {
    if (!name || name.trim().length < 2) {
      // Return partial success — frontend should ask for name
      res.status(200).json({
        success: true,
        requiresName: true,
        message: 'OTP verified. Please provide your name to complete registration.',
        phone,
      });
      return;
    }

    user = await prisma.user.create({
      data: {
        phone,
        name:       name.trim(),
        isVerified: true,
        role:       'CUSTOMER',
      },
    });
  } else {
    // Ensure verified
    if (!user.isVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
      user.isVerified = true;
    }
  }

  if (user.isBlocked) throw new AppError('Your account has been suspended. Contact support.', 403);

  // Generate tokens
  const payload       = { userId: user.id, role: user.role };
  const accessToken   = generateAccessToken(payload);
  const refreshToken  = generateRefreshToken(payload);
  await saveRefreshToken(user.id, refreshToken);

  res.json({
    success: true,
    isNewUser,
    message: isNewUser ? 'Account created successfully!' : 'Logged in successfully!',
    data: {
      user: {
        id:    user.id,
        name:  user.name,
        phone: user.phone,
        email: user.email,
        role:  user.role,
      },
      accessToken,
      refreshToken,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/complete-registration
// Called when new user needs to provide name after OTP verification
// Body: { phone, name }
// ─────────────────────────────────────────────────────────────────────────────
export const completeRegistration = async (req: Request, res: Response): Promise<void> => {
  const { phone, name, email } = req.body;

  if (!phone || !name) throw new AppError('Phone and name are required.', 400);
  if (!isValidNepalPhone(phone)) throw new AppError('Invalid phone number.', 400);
  if (name.trim().length < 2)    throw new AppError('Name must be at least 2 characters.', 400);

  // Ensure OTP was recently verified (check for existing un-expired OTP that is used)
  const recentVerification = await prisma.oTP.findFirst({
    where: {
      phone,
      used: true,
      createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) }, // within 15 min
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!recentVerification) {
    throw new AppError('OTP verification expired. Please request a new OTP.', 400);
  }

  // Check phone not already registered
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AppError('Phone number already registered. Please login.', 409);

  const user = await prisma.user.create({
    data: {
      phone,
      name:       name.trim(),
      email:      email?.trim() || null,
      isVerified: true,
      role:       'CUSTOMER',
    },
  });

  const payload      = { userId: user.id, role: user.role };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await saveRefreshToken(user.id, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Registration complete! Welcome to GM Collection House.',
    data: {
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Body: { refreshToken }
// ─────────────────────────────────────────────────────────────────────────────
export const refreshTokens = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required.', 400);

  const tokens = await rotateTokens(refreshToken);

  res.json({
    success: true,
    data: tokens,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Revokes the refresh token
// ─────────────────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken).catch(() => {}); // silent fail
  }
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout-all
// Revokes ALL refresh tokens for the user (logout from all devices)
// ─────────────────────────────────────────────────────────────────────────────
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  await prisma.refreshToken.deleteMany({ where: { userId } });
  res.json({ success: true, message: 'Logged out from all devices.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns current authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user!.id },
    select: {
      id:        true,
      name:      true,
      phone:     true,
      email:     true,
      role:      true,
      avatar:    true,
      createdAt: true,
      addresses: { where: { isDefault: true }, take: 1 },
    },
  });

  res.json({ success: true, data: user });
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: POST /api/auth/admin-login
// Admin login with phone + OTP (no password — more secure for Nepal context)
// ─────────────────────────────────────────────────────────────────────────────
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  const { phone, otp } = req.body;

  if (!phone || !otp) throw new AppError('Phone and OTP are required.', 400);
  await verifyOTP(phone, 'phone', otp);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new AppError('Admin account not found.', 404);
  if (!['ADMIN', 'SUPER_ADMIN', 'CASHIER'].includes(user.role)) {
    throw new AppError('Access denied. Not an admin account.', 403);
  }
  if (user.isBlocked) throw new AppError('Account suspended.', 403);

  const payload      = { userId: user.id, role: user.role };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await saveRefreshToken(user.id, refreshToken);

  res.json({
    success: true,
    message: 'Admin login successful.',
    data: {
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
      accessToken,
      refreshToken,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// Body: { credential?: string, demoUser?: boolean }
// Authenticates user via Google OAuth (ID token) or dev demo
// ─────────────────────────────────────────────────────────────────────────────
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  const { credential, demoUser } = req.body;

  let googleUser: {
    email: string;
    name: string;
    picture?: string;
    sub: string;
  };

  // 1. In dev/demo mode, support testing with a verified Google profile
  if (demoUser && process.env.NODE_ENV !== 'production') {
    googleUser = {
      sub: 'google_demo_108273918237',
      email: 'maya.gurung@gmail.com',
      name: 'Maya Gurung',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    };
  } else {
    if (!credential) {
      throw new AppError('Google authentication credential is required.', 400);
    }

    try {
      // Verify Google ID token using Google's tokeninfo API
      const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, {
        timeout: 8000,
      });

      const payload = googleRes.data;

      // Validate issuer and email presence
      if (!payload.email || !payload.sub) {
        throw new AppError('Invalid Google credential payload.', 400);
      }

      // If GOOGLE_CLIENT_ID is set in env, verify audience matches
      if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new AppError('Google token audience mismatch.', 401);
      }

      googleUser = {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || payload.given_name || payload.email.split('@')[0],
        picture: payload.picture,
      };
    } catch (err: any) {
      logger.error('Google token verification failed', { error: err.response?.data || err.message });
      throw new AppError('Failed to verify Google account. Please try again.', 401);
    }
  }

  // 2. Find existing user by googleId or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId: googleUser.sub },
        { email: googleUser.email },
      ],
    },
  });

  if (!user) {
    // Create new customer account
    user = await prisma.user.create({
      data: {
        googleId:   googleUser.sub,
        email:      googleUser.email,
        name:       googleUser.name,
        avatar:     googleUser.picture || null,
        isVerified: true,
        role:       'CUSTOMER',
      },
    });
  } else {
    // Update googleId and avatar if not set, ensure verified
    const updateData: any = {};
    if (!user.googleId) updateData.googleId = googleUser.sub;
    if (!user.avatar && googleUser.picture) updateData.avatar = googleUser.picture;
    if (!user.isVerified) updateData.isVerified = true;

    if (Object.keys(updateData).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data:  updateData,
      });
    }
  }

  if (user.isBlocked) {
    throw new AppError('Your account has been suspended. Please contact support.', 403);
  }

  // 3. Generate tokens
  const payload      = { userId: user.id, role: user.role };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await saveRefreshToken(user.id, refreshToken);

  res.json({
    success: true,
    message: `Logged in as ${user.name}`,
    data: {
      user: {
        id:     user.id,
        name:   user.name,
        email:  user.email,
        phone:  user.phone,
        avatar: user.avatar,
        role:   user.role,
      },
      accessToken,
      refreshToken,
    },
  });
};
