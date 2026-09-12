import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { userId: req.user!.id },
        { userId: null }, // broadcast notifications
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  res.json({ success: true, data: notifications });
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.notification.updateMany({
    where: {
      id,
      OR: [
        { userId: req.user!.id },
        { userId: null },
      ],
    },
    data: { isRead: true },
  });

  res.json({ success: true, message: 'Marked as read' });
};
