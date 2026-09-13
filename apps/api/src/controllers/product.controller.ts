import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { uploadToCloudinary } from '../config/cloudinary';
import { processTikTokUrl, isValidTikTokUrl } from '../services/tiktok.service';
import { generateAIFashionImage } from '../services/ai.service';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import slugify from 'slugify';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const generateUniqueSlug = async (name: string): Promise<string> => {
  let slug = slugify(name, { lower: true, strict: true });
  let exists = await prisma.product.findUnique({ where: { slug } });
  let i = 1;
  while (exists) {
    slug = `${slugify(name, { lower: true, strict: true })}-${i++}`;
    exists = await prisma.product.findUnique({ where: { slug } });
  }
  return slug;
};

const generateSKU = (): string => {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `GMC-${ts}-${rand}`;
};

const generateBarcodeBase64 = async (sku: string): Promise<string> => {
  const png = await bwipjs.toBuffer({
    bcid:        'code128',
    text:        sku,
    scale:       3,
    height:      10,
    includetext: true,
    textxalign:  'center',
  });
  return `data:image/png;base64,${png.toString('base64')}`;
};

const generateQRCodeUrl = async (sku: string, productId: string): Promise<string> => {
  const url = `${process.env.CLIENT_URL}/product/${productId}`;
  return QRCode.toDataURL(url, { width: 256, margin: 1 });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products  — Public product listing with filters
// ─────────────────────────────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const {
    page     = '1',
    limit    = '20',
    category,
    search,
    minPrice,
    maxPrice,
    size,
    color,
    sort     = 'createdAt_desc',
    featured,
    newArrival,
    inStock,
    status,
  } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = Math.min(parseInt(limit), 100);

  const where: any = {};

  // Status filtering:
  // If status is provided:
  //   'ALL' -> returns active, draft, and out-of-stock products (excludes archived/discontinued)
  //   'EVERYTHING' -> returns all products including DISCONTINUED
  //   'ACTIVE' | 'DRAFT' | 'DISCONTINUED' | etc. -> returns only products with that status
  // If status is not provided (e.g. public storefront):
  //   defaults to 'ACTIVE'
  if (status && status.toUpperCase() === 'ALL') {
    where.status = { not: 'DISCONTINUED' };
  } else if (status && status.toUpperCase() === 'EVERYTHING') {
    // no status filter
  } else if (status) {
    where.status = status.toUpperCase();
  } else {
    where.status = 'ACTIVE';
  }

  const isFeaturedParam = (req.query.isFeatured ?? req.query.featured) as string | undefined;
  if (isFeaturedParam === 'true') {
    where.isFeatured = true;
  } else if (isFeaturedParam === 'false') {
    where.isFeatured = false;
  }

  const isNewArrivalParam = (req.query.isNewArrival ?? req.query.newArrival) as string | undefined;
  if (isNewArrivalParam === 'true') {
    where.isNewArrival = true;
  } else if (isNewArrivalParam === 'false') {
    where.isNewArrival = false;
  }

  const inStockParam = req.query.inStock as string | undefined;
  if (inStockParam === 'true') {
    where.stock = { gt: 0 };
  }

  // Category filter: For public storefront (when not admin ALL/EVERYTHING), also enforce category.isActive = true
  if (status && (status.toUpperCase() === 'ALL' || status.toUpperCase() === 'EVERYTHING')) {
    if (category) where.category = { slug: category };
  } else {
    where.category = { isActive: true, ...(category ? { slug: category } : {}) };
  }

  if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice) };
  if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) };

  if (size || color) {
    where.variants = {
      some: {
        ...(size  && { size }),
        ...(color && { color }),
        stock: { gt: 0 },
      },
    };
  }

  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku:         { contains: search, mode: 'insensitive' } },
      { tags:        { has: search.toLowerCase() } },
    ];
  }

  const [sortField, sortDir] = sort.split('_');
  const orderBy: any = {};
  if (sortField === 'price')     orderBy.price     = sortDir === 'asc' ? 'asc' : 'desc';
  else if (sortField === 'name') orderBy.name      = sortDir === 'asc' ? 'asc' : 'desc';
  else                           orderBy.createdAt = 'desc';

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id:             true,
        name:           true,
        slug:           true,
        sku:            true,
        status:         true,
        price:          true,
        discountPrice:  true,
        discountEndsAt: true,
        stock:          true,
        isFeatured:     true,
        isNewArrival:   true,
        tiktokUrl:      true,
        tiktokVideoId:  true,
        createdAt:      true,
        category: { select: { id: true, name: true, slug: true } },
        images:   { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true, isAiGenerated: true, isPrimary: true } },
        variants: { select: { size: true, color: true, colorHex: true, stock: true } },
        _count:   { select: { reviews: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page:       parseInt(page),
        limit:      take,
        total,
        totalPages: Math.ceil(total / take),
      },
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:slug  — Single product detail
// ─────────────────────────────────────────────────────────────────────────────
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category:  { select: { id: true, name: true, slug: true } },
      images:    { orderBy: { sortOrder: 'asc' } },
      variants:  true,
      reviews:   {
        where:   { isApproved: true },
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take:    10,
      },
    },
  });

  if (!product) throw new AppError('Product not found.', 404);
  if (product.status === 'DISCONTINUED') throw new AppError('Product no longer available.', 404);

  // Build avg rating
  const ratingAgg = await prisma.review.aggregate({
    where:   { productId: product.id, isApproved: true },
    _avg:    { rating: true },
    _count:  { rating: true },
  });

  res.json({
    success: true,
    data: {
      ...product,
      avgRating:   ratingAgg._avg.rating || 0,
      reviewCount: ratingAgg._count.rating,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products  — Admin: Create product
// ─────────────────────────────────────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const {
    name, description, shortDesc, categoryId,
    price, costPrice, discountPrice, discountEndsAt,
    stock, lowStockAlert, tags, isFeatured, isNewArrival,
    status = 'ACTIVE',
    variants, tiktokUrl,
    autoGenerateAiImage = true, // default: auto-generate on creation
  } = req.body;

  if (!name || !description || !categoryId || !price) {
    throw new AppError('name, description, categoryId, and price are required.', 400);
  }

  const slug = await generateUniqueSlug(name);
  const sku  = generateSKU();

  // Process TikTok URL if provided
  let tiktokData: { tiktokUrl: string; tiktokVideoId: string; tiktokUsername: string } | undefined;
  if (tiktokUrl) {
    if (!isValidTikTokUrl(tiktokUrl)) {
      throw new AppError('Invalid TikTok URL. Please paste a valid TikTok video link.', 400);
    }
    const meta = await processTikTokUrl(tiktokUrl);
    if (meta) {
      tiktokData = {
        tiktokUrl:      meta.rawUrl,
        tiktokVideoId:  meta.videoId,
        tiktokUsername: meta.username,
      };
    }
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      shortDesc,
      categoryId,
      price:          parseFloat(price),
      costPrice:      costPrice ? parseFloat(costPrice) : null,
      discountPrice:  discountPrice ? parseFloat(discountPrice) : null,
      discountEndsAt: discountEndsAt ? new Date(discountEndsAt) : null,
      stock:          parseInt(stock) || 0,
      lowStockAlert:  parseInt(lowStockAlert) || 5,
      sku,
      tags:           Array.isArray(tags) ? tags : [],
      isFeatured:     Boolean(isFeatured),
      isNewArrival:   Boolean(isNewArrival),
      status:         (status as any) || 'ACTIVE',
      ...tiktokData,
      variants: variants?.length ? {
        create: variants.map((v: any) => ({
          size:   v.size   || null,
          color:  v.color  || null,
          colorHex: v.colorHex || null,
          stock:  parseInt(v.stock) || 0,
          price:  v.price ? parseFloat(v.price) : null,
        })),
      } : undefined,
    },
    include: { variants: true, images: true },
  });

  // Generate barcode + QR code
  const [barcodeData, qrCodeData] = await Promise.all([
    generateBarcodeBase64(sku),
    generateQRCodeUrl(sku, product.id),
  ]);

  // Upload barcode to Cloudinary
  const barcodeUpload = await uploadToCloudinary(barcodeData, 'gmc/barcodes');
  const qrUpload      = await uploadToCloudinary(qrCodeData,  'gmc/qrcodes');

  await prisma.product.update({
    where: { id: product.id },
    data:  { barcode: sku, qrCode: qrUpload.url },
  });

  // Auto-generate AI fashion image if no images uploaded yet and flag is set
  if (autoGenerateAiImage) {
    // Fire & forget — don't block the response
    generateAIFashionImage(product.id, name, description).catch(() => {});
  }

  res.status(201).json({
    success: true,
    message: 'Product created successfully! Barcode and QR code generated.',
    data: {
      ...product,
      barcodeUrl: barcodeUpload.url,
      qrCodeUrl:  qrUpload.url,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/products/:id  — Admin: Update product
// ─────────────────────────────────────────────────────────────────────────────
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { id }  = req.params;
  const updates = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Product not found.', 404);

  // Handle TikTok URL update
  let tiktokData = {};
  if (updates.tiktokUrl !== undefined) {
    if (!updates.tiktokUrl) {
      tiktokData = { tiktokUrl: null, tiktokVideoId: null, tiktokUsername: null };
    } else {
      if (!isValidTikTokUrl(updates.tiktokUrl)) {
        throw new AppError('Invalid TikTok URL.', 400);
      }
      const meta = await processTikTokUrl(updates.tiktokUrl);
      if (meta) {
        tiktokData = {
          tiktokUrl:      meta.rawUrl,
          tiktokVideoId:  meta.videoId,
          tiktokUsername: meta.username,
        };
      }
    }
  }

  // Build update slug if name changed
  let slug = existing.slug;
  if (updates.name && updates.name !== existing.name) {
    slug = await generateUniqueSlug(updates.name);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(updates.name           && { name: updates.name, slug }),
      ...(updates.description    && { description: updates.description }),
      ...(updates.shortDesc      !== undefined && { shortDesc: updates.shortDesc }),
      ...(updates.categoryId     && { categoryId: updates.categoryId }),
      ...(updates.price          !== undefined && { price: parseFloat(updates.price) }),
      ...(updates.costPrice      !== undefined && { costPrice: updates.costPrice ? parseFloat(updates.costPrice) : null }),
      ...(updates.discountPrice  !== undefined && { discountPrice: updates.discountPrice ? parseFloat(updates.discountPrice) : null }),
      ...(updates.discountEndsAt !== undefined && { discountEndsAt: updates.discountEndsAt ? new Date(updates.discountEndsAt) : null }),
      ...(updates.stock          !== undefined && { stock: parseInt(updates.stock) }),
      ...(updates.status         && { status: updates.status }),
      ...(updates.isFeatured     !== undefined && { isFeatured: Boolean(updates.isFeatured) }),
      ...(updates.isNewArrival   !== undefined && { isNewArrival: Boolean(updates.isNewArrival) }),
      ...(updates.tags           && { tags: updates.tags }),
      ...tiktokData,
    },
    include: { images: true, variants: true, category: true },
  });

  res.json({ success: true, message: 'Product updated.', data: product });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id  — Admin: Delete product
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: { orderItems: true },
      },
    },
  });

  if (!product) throw new AppError('Product not found.', 404);

  // If the product has historical customer orders, archive it to protect financial accounting records
  if (product._count.orderItems > 0) {
    await prisma.product.update({
      where: { id },
      data: { status: 'DISCONTINUED' },
    });
    res.json({
      success: true,
      message: `Product has ${product._count.orderItems} order record(s) and was moved to Archived.`,
    });
    return;
  }

  // Otherwise, permanently delete the product and its relations (cascades variants, images, cart items, reviews)
  await prisma.product.delete({ where: { id } });

  res.json({ success: true, message: 'Product permanently deleted.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products/:id/images  — Admin: Upload product images/video
// ─────────────────────────────────────────────────────────────────────────────
export const uploadProductMedia = async (req: Request, res: Response): Promise<void> => {
  const { id }        = req.params;
  const { autoAI = 'true' } = req.body; // auto-generate AI image after upload?
  const files         = req.files as Express.Multer.File[];

  if (!files?.length) throw new AppError('No files uploaded.', 400);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found.', 404);

  const existingCount = await prisma.productImage.count({ where: { productId: id } });

  const uploadPromises = files.map(async (file, i) => {
    const isVideo      = file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';
    const folder       = isVideo ? 'gmc/product-videos' : 'gmc/product-images';

    const uploaded = await uploadToCloudinary(file.path, folder, resourceType);

    return prisma.productImage.create({
      data: {
        productId:    id,
        url:          uploaded.url,
        type:         isVideo ? 'video' : 'image',
        isPrimary:    existingCount === 0 && i === 0,
        sortOrder:    existingCount + i,
        isAiGenerated: false,
      },
    });
  });

  const images = await Promise.all(uploadPromises);

  // Auto-generate AI fashion image after real photo upload (if flag enabled)
  if (autoAI === 'true') {
    generateAIFashionImage(id, product.name, product.description).catch(() => {});
  }

  res.json({
    success: true,
    message: `${images.length} file(s) uploaded${autoAI === 'true' ? '. AI fashion image is being generated...' : '.'} `,
    data: images,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products/:id/generate-ai-image  — Admin: Manually trigger AI image
// ─────────────────────────────────────────────────────────────────────────────
export const generateAIImage = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where:   { id },
    include: { images: { where: { isPrimary: true }, take: 1 } },
  });
  if (!product) throw new AppError('Product not found.', 404);

  res.json({
    success: true,
    message: 'AI fashion image generation started. It will appear in product images shortly.',
  });

  // Fire & forget (runs in background)
  generateAIFashionImage(id, product.name, product.description, product.images[0]?.url).catch(() => {});
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id/images/:imageId  — Admin: Remove image
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  const { id, imageId } = req.params;

  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId: id },
  });
  if (!image) throw new AppError('Image not found.', 404);

  await prisma.productImage.delete({ where: { id: imageId } });

  res.json({ success: true, message: 'Image removed.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:id/barcode  — Admin: Download barcode
// ─────────────────────────────────────────────────────────────────────────────
export const getProductBarcode = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id }, select: { sku: true, name: true } });
  if (!product?.sku) throw new AppError('Product or SKU not found.', 404);

  const png = await bwipjs.toBuffer({
    bcid:        'code128',
    text:        product.sku,
    scale:       3,
    height:      10,
    includetext: true,
    textxalign:  'center',
  });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${product.sku}-barcode.png"`);
  res.send(png);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/tiktok-preview  — Fetch TikTok oEmbed preview metadata
// Admin helper: paste URL → see thumbnail + title before saving
// ─────────────────────────────────────────────────────────────────────────────
export const getTikTokPreview = async (req: Request, res: Response): Promise<void> => {
  const { url } = req.query as { url: string };
  if (!url) throw new AppError('TikTok URL required.', 400);
  if (!isValidTikTokUrl(url)) throw new AppError('Invalid TikTok URL.', 400);

  const meta = await processTikTokUrl(url);
  if (!meta) throw new AppError('Could not process TikTok URL. Make sure it is a public video.', 400);

  res.json({
    success: true,
    data: {
      videoId:      meta.videoId,
      username:     meta.username,
      embedUrl:     meta.embedUrl,
      thumbnailUrl: meta.thumbnailUrl,
      title:        meta.title,
      authorName:   meta.authorName,
    },
  });
};
