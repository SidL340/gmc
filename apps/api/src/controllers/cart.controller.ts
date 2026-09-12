import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

export const getCart = async (req: AuthRequest, res: Response) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user!.id },
    include: {
      product: {
        include: {
          images: { orderBy: { isPrimary: 'desc' } },
        },
      },
      variant: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedItems = items.map((item) => {
    const price = item.variant?.price || item.product.discountPrice || item.product.price;
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.name,
      slug: item.product.slug,
      image: item.product.images[0]?.url || null,
      size: item.variant?.size || null,
      color: item.variant?.color || null,
      quantity: item.quantity,
      unitPrice: Number(price),
      totalPrice: Number(price) * item.quantity,
      stock: item.variant ? item.variant.stock : item.product.stock,
    };
  });

  const subtotal = formattedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingCharge = subtotal >= 2000 || subtotal === 0 ? 0 : 150;
  const total = subtotal + shippingCharge;

  res.json({
    success: true,
    data: {
      items: formattedItems,
      itemCount: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      shippingCharge,
      freeShippingThreshold: 2000,
      total,
    },
  });
};

export const addToCart = async (req: AuthRequest, res: Response) => {
  const { productId, variantId, quantity = 1 } = req.body;
  if (!productId) throw new AppError('Product ID is required', 400);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product) throw new AppError('Product not found', 404);

  let stock = product.stock;
  if (variantId) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) throw new AppError('Variant not found', 404);
    stock = variant.stock;
  }

  const existing = await prisma.cartItem.findFirst({
    where: {
      userId: req.user!.id,
      productId,
      variantId: variantId || null,
    },
  });

  const newQuantity = (existing?.quantity || 0) + Number(quantity);
  if (newQuantity > stock) {
    throw new AppError(`Only ${stock} items available in stock`, 400);
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        userId: req.user!.id,
        productId,
        variantId: variantId || null,
        quantity: Number(quantity),
      },
    });
  }

  return getCart(req, res);
};

export const updateCartItem = async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (Number(quantity) < 1) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return getCart(req, res);
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, userId: req.user!.id },
    include: { product: true, variant: true },
  });

  if (!item) throw new AppError('Cart item not found', 404);

  const stock = item.variant ? item.variant.stock : item.product.stock;
  if (Number(quantity) > stock) {
    throw new AppError(`Only ${stock} items available in stock`, 400);
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: Number(quantity) },
  });

  return getCart(req, res);
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, userId: req.user!.id },
  });

  if (!item) throw new AppError('Cart item not found', 404);

  await prisma.cartItem.delete({ where: { id: itemId } });

  return getCart(req, res);
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  await prisma.cartItem.deleteMany({
    where: { userId: req.user!.id },
  });

  res.json({ success: true, message: 'Cart cleared' });
};
