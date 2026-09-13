import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { ShipmentStatus } from '@prisma/client';
import { deliveryService } from '../services/delivery.service';

export const getShipmentByOrder = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;

  const shipment = await prisma.shipment.findUnique({
    where: { orderId },
    include: { statusHistory: { orderBy: { timestamp: 'desc' } } },
  });

  if (!shipment) throw new AppError('Shipment not found', 404);
  res.json({ success: true, data: shipment });
};

export const getShipmentLabel = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipment: true, shippingAddress: true, user: true, items: true, payment: true },
  });

  if (!order) throw new AppError('Order not found', 404);

  let labelData = null;
  if (order.shipment?.ncmShipmentId && !order.shipment.ncmShipmentId.startsWith('STUB-')) {
    labelData = await deliveryService.getOrderLabel(order.shipment.ncmShipmentId);
  }

  // If NCM label API returns null or in test/stub mode, format a clean label object
  if (!labelData) {
    labelData = {
      orderid: order.shipment?.ncmShipmentId || order.orderNumber,
      delivery_type: 'Home',
      cod_charge: order.payment?.method === 'COD' ? Number(order.total) : 0,
      from_branch: {
        name: 'TINKUNE',
        code: 'TINK1',
        district: 'KATHMANDU',
      },
      to_branch: {
        name: order.shippingAddress?.district?.toUpperCase() || 'KATHMANDU',
        code: 'DEST1',
        district: order.shippingAddress?.district || 'KATHMANDU',
      },
      from: {
        name: 'GM Collection House',
        phone: '9851107555',
        phone2: '',
      },
      receiver: {
        name: order.shippingAddress?.fullName || order.user?.name || 'Valued Customer',
        phone: order.shippingAddress?.phone || order.user?.phone || '',
        phone2: '',
        address: `${order.shippingAddress?.streetAddress || ''}, Ward ${order.shippingAddress?.ward || ''}, ${order.shippingAddress?.municipality || ''}, ${order.shippingAddress?.district || ''}`,
      },
      description: {
        description: `GM Collection House Apparel (${order.items.length} items)`,
        delivery_instruction: 'Handle with care - Call customer before delivery',
        handling: 'Non-Fragile',
        vendor_orderid: order.orderNumber,
      },
    };
  }

  res.json({
    success: true,
    data: {
      orderNumber: order.orderNumber,
      trackingNumber: order.shipment?.trackingNumber,
      trackingUrl: order.shipment?.trackingUrl,
      label: labelData,
    },
  });
};

export const getNCMConfig = async (req: Request, res: Response) => {
  res.json({ success: true, data: deliveryService.getConfig() });
};

export const getNCMBranches = async (req: Request, res: Response) => {
  const branches = await deliveryService.getBranches();
  res.json({ success: true, data: branches });
};

export const getNCMRate = async (req: Request, res: Response) => {
  const { branch } = req.query;
  if (!branch) throw new AppError('Destination branch is required', 400);

  const charge = await deliveryService.calculateRate(String(branch));
  res.json({ success: true, data: { branch, charge: charge || 150 } });
};

export const updateShipmentStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, location, description } = req.body;

  if (!status || !Object.values(ShipmentStatus).includes(status)) {
    throw new AppError('Invalid shipment status', 400);
  }

  const shipment = await prisma.shipment.update({
    where: { id },
    data: {
      status: status as ShipmentStatus,
      currentLocation: location,
      statusHistory: {
        create: {
          status: status as ShipmentStatus,
          location,
          description,
        },
      },
    },
  });

  res.json({ success: true, data: shipment });
};
