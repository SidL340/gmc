import { Router } from 'express';
import {
  createOrder, getOrders, getOrder, cancelOrder,
  updateOrderStatus, getOrderTracking
} from '../controllers/order.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/:id/tracking', getOrderTracking);

router.use(authenticate);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/:id/cancel', cancelOrder);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

export default router;
