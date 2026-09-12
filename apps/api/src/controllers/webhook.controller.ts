import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { verifyFonePayCallback, verifyNepalPayCallback } from '../services/payment.service';
import { logger } from '../config/logger';
import { OrderStatus, PaymentStatus, ShipmentStatus } from '@prisma/client';

export const fonePayWebhook = async (req: Request, res: Response) => {
  try {
    logger.info('Received FonePay callback', req.body);
    const isValid = verifyFonePayCallback(req.body);

    const prn = req.body.PRN;
    if (!prn) return res.status(400).send('Missing PRN');

    const payment = await prisma.payment.findFirst({
      where: {
        order: {
          orderNumber: { contains: prn.replace('GMC-', '') },
        },
      },
      include: { order: true },
    });

    if (payment) {
      if (isValid || process.env.NODE_ENV !== 'production') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            gatewayRef: req.body.UID || req.body.BC,
            gatewayResponse: req.body,
            verifiedAt: new Date(),
          },
        });

        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CONFIRMED,
            statusHistory: {
              create: {
                status: OrderStatus.CONFIRMED,
                note: 'Payment verified via FonePay',
              },
            },
          },
        });
      }
    }

    // Redirect to customer checkout success page
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/checkout/success?orderNumber=${payment?.order.orderNumber}`);
  } catch (err: any) {
    logger.error('FonePay webhook error', err);
    res.status(500).send('Error');
  }
};

export const nepalPayWebhook = async (req: Request, res: Response) => {
  try {
    logger.info('Received NepalPay callback', req.body);
    const isValid = verifyNepalPayCallback(req.body);
    const transactionId = req.body.transactionId;

    const payment = await prisma.payment.findFirst({
      where: {
        gatewayRef: transactionId,
      },
      include: { order: true },
    });

    if (payment && (isValid || process.env.NODE_ENV !== 'production')) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          gatewayResponse: req.body,
          verifiedAt: new Date(),
        },
      });

      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          statusHistory: {
            create: {
              status: OrderStatus.CONFIRMED,
              note: 'Payment verified via NepalPay',
            },
          },
        },
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/checkout/success?orderNumber=${payment?.order.orderNumber}`);
  } catch (err: any) {
    logger.error('NepalPay webhook error', err);
    res.status(500).send('Error');
  }
};

export const ncmWebhook = async (req: Request, res: Response) => {
  try {
    logger.info('Received NepalCanMove webhook', req.body);
    const orderId = req.body.order_id || req.body.orderid || req.body.orderId;
    const trackingNumber = req.body.tracking_number || req.body.trackid || req.body.trackingNumber;
    const rawStatus = (req.body.status || req.body.event || '').toUpperCase();
    const location = req.body.location || req.body.branch || '';
    const notes = req.body.notes || req.body.message || '';

    if (!orderId && !trackingNumber) {
      return res.status(400).json({ message: 'Missing order_id or tracking_number' });
    }

    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ ncmShipmentId: String(orderId) }] : []),
          ...(trackingNumber ? [{ trackingNumber: String(trackingNumber) }] : []),
        ],
      },
    });

    if (shipment) {
      let mappedStatus: ShipmentStatus = ShipmentStatus.IN_TRANSIT;
      let mappedOrderStatus: OrderStatus | null = null;

      if (rawStatus.includes('DELIVERED')) {
        mappedStatus = ShipmentStatus.DELIVERED;
        mappedOrderStatus = OrderStatus.DELIVERED;
      } else if (rawStatus.includes('PICK') || rawStatus.includes('RECEIVED')) {
        mappedStatus = ShipmentStatus.PICKED_UP;
        mappedOrderStatus = OrderStatus.SHIPPED;
      } else if (rawStatus.includes('OUT') || rawStatus.includes('DELIVERY')) {
        mappedStatus = ShipmentStatus.OUT_FOR_DELIVERY;
        mappedOrderStatus = OrderStatus.OUT_FOR_DELIVERY;
      } else if (rawStatus.includes('RETURN') || rawStatus.includes('CANCEL')) {
        mappedStatus = ShipmentStatus.RETURNED;
        mappedOrderStatus = OrderStatus.RETURNED;
      } else if (rawStatus.includes('TRANSIT') || rawStatus.includes('DISPATCH') || rawStatus.includes('HUB')) {
        mappedStatus = ShipmentStatus.IN_TRANSIT;
        mappedOrderStatus = OrderStatus.SHIPPED;
      }

      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: mappedStatus,
          currentLocation: location || undefined,
          notes: notes || undefined,
          ...(mappedStatus === ShipmentStatus.DELIVERED && { deliveredAt: new Date() }),
          statusHistory: {
            create: {
              status: mappedStatus,
              location,
              description: notes || `Shipment status updated to ${mappedStatus} via NCM`,
            },
          },
        },
      });

      if (mappedOrderStatus) {
        await prisma.order.update({
          where: { id: shipment.orderId },
          data: {
            status: mappedOrderStatus,
            statusHistory: {
              create: {
                status: mappedOrderStatus,
                note: `Order status updated to ${mappedOrderStatus} via NepalCanMove`,
              },
            },
          },
        });
      }
    }

    res.json({ success: true, message: 'Processed successfully' });
  } catch (err: any) {
    logger.error('NCM webhook error', err);
    res.status(500).json({ success: false });
  }
};
