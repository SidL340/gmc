import { Router } from 'express';
import { getPaymentStatus } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/:orderId', authenticate, getPaymentStatus);

export default router;
