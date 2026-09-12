import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

export const getStoreSettings = async (req: Request, res: Response) => {
  const settings = await prisma.storeSetting.findMany();
  res.json({ success: true, data: settings });
};

export const updateStoreSetting = async (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key) throw new AppError('Setting key is required', 400);

  const setting = await prisma.storeSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });

  res.json({ success: true, data: setting });
};
