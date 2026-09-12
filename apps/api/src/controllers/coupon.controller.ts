import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { DiscountType } from '@prisma/client';

export const validateCoupon = async (req: Request, res: Response) => {
  const { code, orderAmount } = req.body;
  if (!code) throw new AppError('Coupon code is required', 400);

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError('Invalid or expired coupon', 400);
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new AppError('Coupon is not active yet', 400);
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new AppError('Coupon has expired', 400);
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('Coupon usage limit reached', 400);
  }

  if (coupon.minOrderValue && Number(orderAmount) < Number(coupon.minOrderValue)) {
    throw new AppError(`Minimum order amount of Rs. ${coupon.minOrderValue} required for this coupon`, 400);
  }

  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = (Number(orderAmount) * Number(coupon.discountValue)) / 100;
    if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
      discount = Number(coupon.maxDiscount);
    }
  } else {
    discount = Number(coupon.discountValue);
  }

  res.json({
    success: true,
    data: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: Math.round(discount),
      description: coupon.description,
    },
  });
};

export const getCoupons = async (req: Request, res: Response) => {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: coupons });
};

export const createCoupon = async (req: Request, res: Response) => {
  const {
    code, description, discountType, discountValue,
    minOrderValue, maxDiscount, usageLimit, startsAt, expiresAt
  } = req.body;

  if (!code || !discountType || !discountValue) {
    throw new AppError('Code, discount type, and discount value are required', 400);
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: code.toUpperCase().trim(),
      description,
      discountType: discountType as DiscountType,
      discountValue,
      minOrderValue: minOrderValue || null,
      maxDiscount: maxDiscount || null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  res.status(201).json({ success: true, data: coupon });
};

export const deleteCoupon = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.coupon.delete({ where: { id } });
  res.json({ success: true, message: 'Coupon deleted' });
};
