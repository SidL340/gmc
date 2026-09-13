import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { initiateFonePay, initiateNepalPay, initiateCOD } from '../services/payment.service';
import { deliveryService } from '../services/delivery.service';
import { OrderStatus, PaymentMethod, PaymentStatus, ShipmentStatus } from '@prisma/client';

export const createOrder = async (req: AuthRequest, res: Response) => {
  const {
    shippingAddressId,
    billingAddressId,
    sameAsShipping = true,
    paymentMethod,
    couponCode,
    customerNote,
    items: bodyItems,
  } = req.body;

  if (!shippingAddressId) throw new AppError('Shipping address is required', 400);
  if (!paymentMethod || !['FONEPAY', 'NEPALPAY', 'COD'].includes(paymentMethod)) {
    throw new AppError('Invalid or missing payment method (FONEPAY, NEPALPAY, COD)', 400);
  }

  // Verify shipping address exists
  const shippingAddress = await prisma.address.findFirst({
    where: { id: shippingAddressId, userId: req.user!.id },
  });
  if (!shippingAddress) throw new AppError('Shipping address not found', 404);

  // Get cart items from request body or database
  let cartItems: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    product: any;
    variant: any;
  }> = [];

  if (bodyItems && Array.isArray(bodyItems) && bodyItems.length > 0) {
    for (const item of bodyItems) {
      if (!item.productId) continue;
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { images: { orderBy: { isPrimary: 'desc' } } },
      });
      if (!product) continue;

      let variant = null;
      if (item.variantId) {
        variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
      }

      cartItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: Math.max(1, parseInt(item.quantity) || 1),
        product,
        variant,
      });
    }
  } else {
    cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user!.id },
      include: {
        product: { include: { images: { orderBy: { isPrimary: 'desc' } } } },
        variant: true,
      },
    });
  }

  if (!cartItems.length) throw new AppError('Cart is empty', 400);

  // Validate stock
  for (const item of cartItems) {
    const available = item.variant ? item.variant.stock : item.product.stock;
    if (item.quantity > available) {
      throw new AppError(`Not enough stock for "${item.product.name}". Only ${available} left.`, 400);
    }
  }

  // Calculate subtotal
  let subtotal = 0;
  const orderItemData = cartItems.map((item) => {
    const unitPrice = Number(item.variant?.price || item.product.discountPrice || item.product.price);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;
    return {
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      imageUrl: item.product.images[0]?.url || null,
      size: item.variant?.size || null,
      color: item.variant?.color || null,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
    };
  });

  // Calculate coupon discount
  let discountAmount = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });
    if (coupon && coupon.isActive) {
      const now = new Date();
      if ((!coupon.startsAt || coupon.startsAt <= now) && (!coupon.expiresAt || coupon.expiresAt >= now)) {
        if (!coupon.minOrderValue || subtotal >= Number(coupon.minOrderValue)) {
          if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
            if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
              discountAmount = Number(coupon.maxDiscount);
            }
          } else {
            discountAmount = Number(coupon.discountValue);
          }
          couponId = coupon.id;
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }
  }

  const shippingCharge = subtotal >= 2000 ? 0 : 150;
  const total = Math.max(0, subtotal - discountAmount + shippingCharge);

  // Sequential order number GMC-YYYYMMDD-XXXXX
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = await prisma.order.count({
    where: {
      orderNumber: { startsWith: `GMC-${todayStr}` },
    },
  });
  const seq = String(countToday + 1).padStart(5, '0');
  const orderNumber = `GMC-${todayStr}-${seq}`;

  // Execute in transaction: create Order, OrderItems, Payment, deduct stock, clear cart
  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: req.user!.id,
        status: OrderStatus.PENDING,
        subtotal,
        discountAmount,
        shippingCharge,
        vatAmount: 0,
        total,
        shippingAddressId,
        billingAddressId: sameAsShipping ? shippingAddressId : billingAddressId,
        sameAsShipping,
        couponId,
        couponCode: couponCode ? couponCode.toUpperCase() : null,
        customerNote,
        items: { create: orderItemData },
        statusHistory: {
          create: {
            status: OrderStatus.PENDING,
            note: 'Order created',
          },
        },
      },
      include: {
        items: true,
        shippingAddress: true,
      },
    });

    // Deduct stock
    for (const item of cartItems) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Clear user cart
    await tx.cartItem.deleteMany({
      where: { userId: req.user!.id },
    });

    // Create payment record
    await tx.payment.create({
      data: {
        orderId: createdOrder.id,
        method: paymentMethod as PaymentMethod,
        status: PaymentStatus.PENDING,
        amount: total,
      },
    });

    return createdOrder;
  });

  // Initiate payment
  let paymentInitiation;
  if (paymentMethod === 'FONEPAY') {
    paymentInitiation = await initiateFonePay(order.id, total, order.orderNumber);
  } else if (paymentMethod === 'NEPALPAY') {
    paymentInitiation = await initiateNepalPay(order.id, total, order.orderNumber);
  } else {
    paymentInitiation = initiateCOD(order.id, total);
  }

  res.status(201).json({
    success: true,
    data: {
      order,
      payment: paymentInitiation,
    },
  });
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';

  const where: any = {};
  if (!isAdmin) {
    where.userId = req.user!.id;
  }
  if (status && status !== 'ALL') {
    where.status = status as OrderStatus;
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: String(search), mode: 'insensitive' } },
      { user: { name: { contains: String(search), mode: 'insensitive' } } },
      { user: { phone: { contains: String(search) } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        payment: true,
        shipment: true,
        user: { select: { id: true, name: true, phone: true } },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

export const getOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';

  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(!isAdmin && { userId: req.user!.id }),
    },
    include: {
      items: true,
      payment: true,
      shipment: { include: { statusHistory: { orderBy: { timestamp: 'desc' } } } },
      shippingAddress: true,
      billingAddress: true,
      statusHistory: { orderBy: { createdAt: 'desc' } },
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  if (!order) throw new AppError('Order not found', 404);
  res.json({ success: true, data: order });
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';

  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(!isAdmin && { userId: req.user!.id }),
    },
    include: { items: true },
  });

  if (!order) throw new AppError('Order not found', 404);

  if (!isAdmin && order.status !== OrderStatus.PENDING) {
    throw new AppError('You can only cancel pending orders', 400);
  }

  // Restore inventory
  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        statusHistory: {
          create: {
            status: OrderStatus.CANCELLED,
            note: req.body.note || (isAdmin ? 'Cancelled by admin' : 'Cancelled by customer'),
            createdBy: req.user!.name,
          },
        },
      },
    });
  });

  res.json({ success: true, message: 'Order cancelled successfully' });
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status || !Object.values(OrderStatus).includes(status)) {
    throw new AppError('Invalid order status', 400);
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { shippingAddress: true, items: true, payment: true },
  });
  if (!order) throw new AppError('Order not found', 404);

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: status as OrderStatus,
      statusHistory: {
        create: {
          status: status as OrderStatus,
          note,
          createdBy: req.user!.name,
        },
      },
    },
  });

  // When order moves to PACKED, automatically generate shipment with NepalCanMove
  if (status === OrderStatus.PACKED && order.shippingAddress) {
    const existingShipment = await prisma.shipment.findUnique({ where: { orderId: id } });
    if (!existingShipment) {
      const isCod = order.payment?.method === PaymentMethod.COD;
      const shipmentResult = await deliveryService.createShipment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        recipientName: order.shippingAddress.fullName,
        recipientPhone: order.shippingAddress.phone,
        recipientAddress: `${order.shippingAddress.streetAddress}, Ward ${order.shippingAddress.ward}`,
        recipientDistrict: order.shippingAddress.district,
        recipientMunicipality: order.shippingAddress.municipality,
        recipientProvince: order.shippingAddress.province,
        codAmount: isCod ? Number(order.total) : 0,
        itemDescription: `GM Collection House Clothing - ${order.items.length} items`,
      });

      await prisma.shipment.create({
        data: {
          orderId: order.id,
          ncmShipmentId: shipmentResult.ncmShipmentId,
          trackingNumber: shipmentResult.trackingNumber,
          trackingUrl: shipmentResult.trackingUrl,
          status: ShipmentStatus.PENDING,
          statusHistory: {
            create: {
              status: ShipmentStatus.PENDING,
              description: 'Shipment created and ready for pickup',
            },
          },
        },
      });
    }
  }

  res.json({ success: true, data: updatedOrder });
};

export const getOrderTracking = async (req: Request, res: Response) => {
  const { id } = req.params;

  const shipment = await prisma.shipment.findUnique({
    where: { orderId: id },
    include: { statusHistory: { orderBy: { timestamp: 'desc' } } },
  });

  if (!shipment) {
    return res.json({
      success: true,
      data: { status: 'PENDING', message: 'Order is being prepared for dispatch' },
    });
  }

  if (shipment.trackingNumber) {
    const liveTracking = await deliveryService.getTrackingStatus(shipment.trackingNumber);
    return res.json({
      success: true,
      data: {
        ...shipment,
        live: liveTracking,
      },
    });
  }

  res.json({ success: true, data: shipment });
};
