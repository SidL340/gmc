import { Router } from 'express';
import {
  getShipmentByOrder,
  getShipmentLabel,
  getNCMBranches,
  getNCMRate,
  getNCMConfig,
  updateShipmentStatus,
  createNCMPickupTicket,
  getCustomerRating,
  handleNCMWebhook,
} from '../controllers/shipment.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/config', getNCMConfig);
router.get('/branches', getNCMBranches);
router.get('/rate', getNCMRate);
router.post('/webhook', handleNCMWebhook);

router.post('/pickup-ticket', authenticate, requireAdmin, createNCMPickupTicket);
router.get('/customer-rating', authenticate, requireAdmin, getCustomerRating);

router.get('/:orderId', authenticate, getShipmentByOrder);
router.get('/:orderId/label', authenticate, requireAdmin, getShipmentLabel);
router.patch('/:id/status', authenticate, requireAdmin, updateShipmentStatus);

export default router;
