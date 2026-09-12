import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { prisma } from '../config/db';
import { AppError } from './errorHandler';
import { UserRole } from '@prisma/client';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id:    string;
        role:  UserRole;
        name:  string;
        phone: string | null;
        email: string | null;
      };
    }
  }
}

export type AuthRequest = Request;

/**
 * Authenticate any request — extracts JWT from Authorization header
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Please login.', 401);
  }

  const token   = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  const user = await prisma.user.findUnique({
    where:  { id: payload.userId },
    select: { id: true, role: true, name: true, phone: true, email: true, isBlocked: true },
  });

  if (!user)            throw new AppError('User not found.',  401);
  if (user.isBlocked)   throw new AppError('Account suspended. Contact support.', 403);

  req.user = {
    id:    user.id,
    role:  user.role,
    name:  user.name,
    phone: user.phone,
    email: user.email,
  };

  next();
};

/**
 * Optional auth — attaches user if token present, continues if not
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token   = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user    = await prisma.user.findUnique({
      where:  { id: payload.userId },
      select: { id: true, role: true, name: true, phone: true, email: true, isBlocked: true },
    });
    if (user && !user.isBlocked) {
      req.user = { id: user.id, role: user.role, name: user.name, phone: user.phone, email: user.email };
    }
  } catch {
    // Invalid token — continue as guest
  }

  next();
};

/**
 * Require specific roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('Authentication required.', 401);
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action.', 403);
    }
    next();
  };
};

// Shorthand role guards
export const requireAdmin     = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);
export const requireCashier   = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CASHIER);
