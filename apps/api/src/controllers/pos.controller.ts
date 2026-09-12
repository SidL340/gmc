import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { PaymentMethod } from '@prisma/client';

export const searchPOSProducts = async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: [] });

  const query = String(q).trim();

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { barcode: query },
        { sku: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      variants: true,
    },
    take: 15,
  });

  res.json({ success: true, data: products });
};

export const createPOSSale = async (req: AuthRequest, res: Response) => {
  const {
    items,
    paymentMethod,
    amountPaid,
    customerName,
    customerPhone,
    billDiscount = 0,
    note,
  } = req.body;

  if (!items || !items.length) {
    throw new AppError('Sale items cannot be empty', 400);
  }

  let subtotal = 0;
  const saleItemsData = items.map((item: any) => {
    const lineTotal = (Number(item.unitPrice) - Number(item.discount || 0)) * Number(item.quantity);
    subtotal += lineTotal;
    return {
      productId: item.productId,
      productName: item.productName || 'Clothing Item',
      barcode: item.barcode || null,
      size: item.size || null,
      color: item.color || null,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount || 0),
      totalPrice: lineTotal,
    };
  });

  const total = Math.max(0, subtotal - Number(billDiscount));
  const changeGiven = paymentMethod === 'CASH' ? Math.max(0, Number(amountPaid) - total) : 0;

  // Generate receiptNumber: GMC-POS-YYYYMMDD-XXXXX
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = await prisma.pOSSale.count({
    where: { receiptNumber: { startsWith: `GMC-POS-${todayStr}` } },
  });
  const seq = String(countToday + 1).padStart(5, '0');
  const receiptNumber = `GMC-POS-${todayStr}-${seq}`;

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.pOSSale.create({
      data: {
        receiptNumber,
        cashierId: req.user!.id,
        subtotal,
        discountAmount: Number(billDiscount),
        vatAmount: 0,
        total,
        paymentMethod: paymentMethod as PaymentMethod,
        amountPaid: Number(amountPaid),
        changeGiven,
        customerName,
        customerPhone,
        note,
        items: {
          create: saleItemsData,
        },
      },
      include: { items: true },
    });

    // Deduct stock
    for (const item of items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: Number(item.quantity) } },
        });
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: Number(item.quantity) } },
      });
    }

    return created;
  });

  res.status(201).json({ success: true, data: sale });
};

export const getPOSSales = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, from, to } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (from && to) {
    where.createdAt = {
      gte: new Date(String(from)),
      lte: new Date(String(to)),
    };
  }

  const [sales, total] = await Promise.all([
    prisma.pOSSale.findMany({
      where,
      include: {
        cashier: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.pOSSale.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      sales,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

export const getPOSSaleReceipt = async (req: Request, res: Response) => {
  const { id } = req.params;

  const sale = await prisma.pOSSale.findUnique({
    where: { id },
    include: {
      cashier: { select: { name: true } },
      items: true,
    },
  });

  if (!sale) throw new AppError('Sale record not found', 404);
  res.json({ success: true, data: sale });
};
