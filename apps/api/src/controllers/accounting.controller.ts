import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: Request, res: Response) => {
  const { period = 'month' } = req.query;

  let startDate = new Date();
  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === 'month') {
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (period === 'year') {
    startDate.setFullYear(startDate.getFullYear() - 1);
  }

  // Completed orders
  const orders = await prisma.order.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'RETURNED'] },
      createdAt: { gte: startDate },
    },
    include: {
      items: { include: { product: true } },
    },
  });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

  // Calculate COGS
  let totalCOGS = 0;
  for (const o of orders) {
    for (const item of o.items) {
      const cost = Number(item.product.costPrice || Number(item.product.price) * 0.6); // default 40% margin estimate if no cost
      totalCOGS += cost * item.quantity;
    }
  }

  const grossProfit = totalRevenue - totalCOGS;

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startDate } },
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Top products
  const productCountMap: Record<string, { name: string; sold: number; revenue: number }> = {};
  for (const o of orders) {
    for (const item of o.items) {
      if (!productCountMap[item.productId]) {
        productCountMap[item.productId] = { name: item.productName, sold: 0, revenue: 0 };
      }
      productCountMap[item.productId].sold += item.quantity;
      productCountMap[item.productId].revenue += Number(item.totalPrice);
    }
  }
  const topProducts = Object.values(productCountMap).sort((a, b) => b.sold - a.sold).slice(0, 5);

  // Customers count
  const totalCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } });

  // Daily trend
  const dailyMap: Record<string, number> = {};
  orders.forEach((o) => {
    const day = o.createdAt.toISOString().slice(5, 10);
    dailyMap[day] = (dailyMap[day] || 0) + Number(o.total);
  });
  const dailySales = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }));

  res.json({
    success: true,
    data: {
      totalRevenue,
      totalOrders,
      totalProfit: grossProfit,
      netProfit: grossProfit - totalExpenses,
      totalExpenses,
      totalCustomers,
      avgOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      topProducts,
      dailySales,
    },
  });
};

export const getExpenses = async (req: Request, res: Response) => {
  const { limit = 50 } = req.query;
  const expenses = await prisma.expense.findMany({
    orderBy: { date: 'desc' },
    take: Number(limit),
  });
  res.json({ success: true, data: expenses });
};

export const addExpense = async (req: AuthRequest, res: Response) => {
  const { category, description, amount, date, receiptUrl } = req.body;

  if (!category || !description || !amount) {
    throw new AppError('Category, description, and amount are required', 400);
  }

  const expense = await prisma.expense.create({
    data: {
      category,
      description,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      receiptUrl,
      createdBy: req.user!.name,
    },
  });

  res.status(201).json({ success: true, data: expense });
};

export const deleteExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.expense.delete({ where: { id } });
  res.json({ success: true, message: 'Expense deleted' });
};
