import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET          = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_SECRET      = process.env.REFRESH_TOKEN_SECRET!;
const REFRESH_EXPIRES_IN  = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export interface TokenPayload {
  userId: string;
  role:   string;
}

// ── Generate Tokens ────────────────────────────────────────────────────────────

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

// ── OTP Utilities ─────────────────────────────────────────────────────────────

/**
 * Generate a secure 6-digit OTP
 */
export const generateOTP = (): string => {
  // Cryptographically secure random 6-digit number
  const array = new Uint32Array(1);
  // Node.js crypto alternative
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(4);
  const num = randomBytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
};

/**
 * Store OTP in database with 10-minute expiry
 */
export const storeOTP = async (
  identifier: string,
  type: 'phone' | 'email',
  code: string,
): Promise<void> => {
  // Invalidate any existing OTPs for this identifier
  await prisma.oTP.updateMany({
    where: {
      OR: [
        { phone: type === 'phone' ? identifier : undefined },
        { email: type === 'email' ? identifier : undefined },
      ],
      used: false,
    },
    data: { used: true },
  });

  await prisma.oTP.create({
    data: {
      code,
      phone:     type === 'phone' ? identifier : null,
      email:     type === 'email' ? identifier : null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });
};

/**
 * Verify OTP — returns true if valid, throws on failure
 */
export const verifyOTP = async (
  identifier: string,
  type: 'phone' | 'email',
  code: string,
): Promise<boolean> => {
  const otp = await prisma.oTP.findFirst({
    where: {
      OR: [
        { phone: type === 'phone' ? identifier : undefined },
        { email: type === 'email' ? identifier : undefined },
      ],
      code,
      used:      false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    throw new AppError('Invalid or expired OTP. Please request a new one.', 400);
  }

  // Mark OTP as used
  await prisma.oTP.update({
    where: { id: otp.id },
    data:  { used: true },
  });

  return true;
};

/**
 * Save refresh token to DB for tracking / revocation
 */
export const saveRefreshToken = async (userId: string, token: string): Promise<void> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
};

/**
 * Revoke a refresh token
 */
export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

/**
 * Refresh token rotation — revoke old, issue new pair
 */
export const rotateTokens = async (
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const payload = verifyRefreshToken(refreshToken);

  // Check token exists in DB (not revoked)
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token revoked or expired. Please login again.', 401);
  }

  // Revoke old token
  await revokeRefreshToken(refreshToken);

  // Issue new pair
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.isBlocked) {
    throw new AppError('Account not found or blocked.', 401);
  }

  const newPayload: TokenPayload = { userId: user.id, role: user.role };
  const newAccess  = generateAccessToken(newPayload);
  const newRefresh = generateRefreshToken(newPayload);

  await saveRefreshToken(user.id, newRefresh);

  return { accessToken: newAccess, refreshToken: newRefresh };
};
