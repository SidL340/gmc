import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { uploadToCloudinary } from '../config/cloudinary';
import slugify from 'slugify';

export const getCategories = async (req: Request, res: Response) => {
  const { all, includeInactive } = req.query;
  const showAll = all === 'true' || includeInactive === 'true';
  const where = showAll ? {} : { isActive: true };

  const categories = await prisma.category.findMany({
    where,
    include: {
      children: showAll ? true : { where: { isActive: true } },
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  res.json({ success: true, data: categories });
};

export const getCategoryBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: true,
      parent: { select: { id: true, name: true, slug: true } },
      products: {
        where: { status: 'ACTIVE' },
        include: { images: true },
        take: 50,
      },
      _count: { select: { products: true } },
    },
  });

  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, data: category });
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, slug: customSlug, description, imageUrl, parentId, sortOrder, isActive } = req.body;
  if (!name?.trim()) throw new AppError('Category name is required', 400);

  let slug = customSlug?.trim()
    ? slugify(customSlug, { lower: true, strict: true })
    : slugify(name, { lower: true, strict: true });

  if (!slug) {
    slug = 'category-' + Date.now();
  }

  // Check if slug exists, append random suffix if collision
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      parentId: parentId || null,
      sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
  });

  res.status(201).json({ success: true, data: category });
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug: customSlug, description, imageUrl, parentId, sortOrder, isActive } = req.body;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new AppError('Category not found', 404);

  const updateData: any = {};

  if (name !== undefined && name.trim() !== '') {
    updateData.name = name.trim();
  }

  if (customSlug !== undefined && customSlug.trim() !== '') {
    const newSlug = slugify(customSlug, { lower: true, strict: true });
    // Check if new slug conflicts with a different category
    const conflict = await prisma.category.findUnique({ where: { slug: newSlug } });
    if (conflict && conflict.id !== id) {
      throw new AppError('Category slug is already taken by another category', 400);
    }
    updateData.slug = newSlug;
  } else if (name !== undefined && name.trim() !== '' && !customSlug) {
    // If name changed and no customSlug provided, update slug
    const newSlug = slugify(name, { lower: true, strict: true });
    const conflict = await prisma.category.findUnique({ where: { slug: newSlug } });
    if (!conflict || conflict.id === id) {
      updateData.slug = newSlug;
    }
  }

  if (description !== undefined) updateData.description = description?.trim() || null;
  if (imageUrl !== undefined)    updateData.imageUrl    = imageUrl?.trim() || null;
  if (parentId !== undefined)    updateData.parentId    = parentId || null;
  if (sortOrder !== undefined)   updateData.sortOrder   = parseInt(String(sortOrder), 10);
  if (isActive !== undefined)    updateData.isActive    = Boolean(isActive);

  const category = await prisma.category.update({
    where: { id },
    data: updateData,
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
  });

  res.json({ success: true, data: category });
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });

  if (!category) throw new AppError('Category not found', 404);

  if (category._count.children > 0) {
    throw new AppError(
      `Cannot delete category with ${category._count.children} sub-categories. Please reassign or delete sub-categories first.`,
      400
    );
  }

  // If no products are linked, permanently hard-delete
  if (category._count.products === 0) {
    await prisma.category.delete({ where: { id } });
    return res.json({
      success: true,
      message: `Category "${category.name}" permanently deleted.`,
      deleted: true,
    });
  }

  // If products are linked, deactivate it to preserve order/product integrity
  await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });

  res.json({
    success: true,
    message: `Category "${category.name}" deactivated. (Preserved in database because ${category._count.products} products are assigned to it).`,
    deactivated: true,
  });
};

export const uploadCategoryImage = async (req: Request, res: Response): Promise<void> => {
  const file = req.file as Express.Multer.File;
  if (!file) throw new AppError('No image file provided.', 400);

  const uploaded = await uploadToCloudinary(file.path, 'gmc/categories', 'image');

  res.json({
    success: true,
    data: {
      url: uploaded.url,
    },
  });
};
