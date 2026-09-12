import { Router } from 'express';
import {
  getShipmentByOrder,
  getShipmentLabel,
  getNCMBranches,
  getNCMRate,
  updateShipmentStatus,
} from '../controllers/shipment.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/branches', getNCMBranches);
router.get('/rate', getNCMRate);
router.get('/:orderId', authenticate, getShipmentByOrder);
router.get('/:orderId/label', authenticate, requireAdmin, getShipmentLabel);
router.patch('/:id/status', authenticate, requireAdmin, updateShipmentStatus);

export default router;
