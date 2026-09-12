import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import slugify from 'slugify';

export const getCategories = async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      children: { where: { isActive: true } },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ success: true, data: categories });
};

export const getCategoryBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: true,
      products: {
        where: { status: 'ACTIVE' },
        include: { images: true },
        take: 20,
      },
    },
  });

  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, data: category });
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, description, imageUrl, parentId, sortOrder } = req.body;
  if (!name) throw new AppError('Category name is required', 400);

  const slug = slugify(name, { lower: true, strict: true });

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description,
      imageUrl,
      parentId: parentId || null,
      sortOrder: sortOrder || 0,
    },
  });

  res.status(201).json({ success: true, data: category });
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, imageUrl, parentId, sortOrder, isActive } = req.body;

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name && { name, slug: slugify(name, { lower: true, strict: true }) }),
      ...(description !== undefined && { description }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(parentId !== undefined && { parentId: parentId || null }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.json({ success: true, data: category });
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });

  res.json({ success: true, message: 'Category deactivated' });
};
