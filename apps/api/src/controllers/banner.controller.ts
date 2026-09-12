import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

export const getBanners = async (req: Request, res: Response) => {
  const { position } = req.query;

  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      ...(position && { position: String(position) }),
    },
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ success: true, data: banners });
};

export const createBanner = async (req: Request, res: Response) => {
  const { title, imageUrl, linkUrl, position, sortOrder } = req.body;

  if (!title || !imageUrl) throw new AppError('Title and image URL are required', 400);

  const banner = await prisma.banner.create({
    data: {
      title,
      imageUrl,
      linkUrl,
      position: position || 'hero',
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    },
  });

  res.status(201).json({ success: true, data: banner });
};

export const updateBanner = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, imageUrl, linkUrl, position, sortOrder, isActive } = req.body;

  const banner = await prisma.banner.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(imageUrl && { imageUrl }),
      ...(linkUrl !== undefined && { linkUrl }),
      ...(position && { position }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.json({ success: true, data: banner });
};

export const deleteBanner = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.banner.delete({ where: { id } });
  res.json({ success: true, message: 'Banner deleted' });
};
