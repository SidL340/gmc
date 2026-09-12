import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

export const getAdminOverview = async (req: Request, res: Response) => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    pendingOrders,
    outOfStockCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      outOfStockCount,
    },
  });
};

export const getUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { phone: { contains: String(search) } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isVerified: true,
        isBlocked: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

export const updateUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isBlocked, role } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(isBlocked !== undefined && { isBlocked }),
      ...(role && { role }),
    },
  });

  res.json({ success: true, data: user });
};
