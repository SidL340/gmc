import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

export const getProductReviews = async (req: Request, res: Response) => {
  const { productId } = req.params;

  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const ratingAvg = reviews.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  res.json({
    success: true,
    data: {
      reviews,
      total: reviews.length,
      averageRating: Number(ratingAvg.toFixed(1)),
    },
  });
};

export const addReview = async (req: AuthRequest, res: Response) => {
  const { productId, rating, title, comment, imageUrls } = req.body;

  if (!productId || !rating || rating < 1 || rating > 5) {
    throw new AppError('Product ID and valid rating (1-5) are required', 400);
  }

  // Check if verified purchaser
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId: req.user!.id,
        status: 'DELIVERED',
      },
    },
  });

  const review = await prisma.review.upsert({
    where: {
      productId_userId: {
        productId,
        userId: req.user!.id,
      },
    },
    create: {
      productId,
      userId: req.user!.id,
      rating: Number(rating),
      title,
      comment,
      imageUrls: imageUrls || [],
      isVerified: !!hasPurchased,
      isApproved: true, // auto approve
    },
    update: {
      rating: Number(rating),
      title,
      comment,
      imageUrls: imageUrls || [],
    },
  });

  res.status(201).json({ success: true, data: review });
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.review.delete({ where: { id } });
  res.json({ success: true, message: 'Review deleted' });
};
