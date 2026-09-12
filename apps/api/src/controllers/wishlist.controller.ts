import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

export const getWishlist = async (req: AuthRequest, res: Response) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.user!.id },
    include: {
      product: {
        include: {
          images: { orderBy: { isPrimary: 'desc' } },
          category: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: items });
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  if (!productId) throw new AppError('Product ID is required', 400);

  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: {
        userId: req.user!.id,
        productId,
      },
    },
  });

  if (!existing) {
    await prisma.wishlistItem.create({
      data: {
        userId: req.user!.id,
        productId,
      },
    });
  }

  res.json({ success: true, message: 'Added to wishlist' });
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  const { productId } = req.params;

  await prisma.wishlistItem.deleteMany({
    where: {
      userId: req.user!.id,
      productId,
    },
  });

  res.json({ success: true, message: 'Removed from wishlist' });
};
