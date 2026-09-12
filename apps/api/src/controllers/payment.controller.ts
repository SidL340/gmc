import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

export const getPaymentStatus = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          userId: true,
        },
      },
    },
  });

  if (!payment) throw new AppError('Payment not found', 404);

  const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
  if (!isAdmin && payment.order.userId !== req.user!.id) {
    throw new AppError('Forbidden', 403);
  }

  res.json({ success: true, data: payment });
};
