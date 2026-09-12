import { Router } from 'express';
import { validateCoupon, getCoupons, createCoupon, deleteCoupon } from '../controllers/coupon.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.post('/validate', validateCoupon);
router.get('/', authenticate, requireAdmin, getCoupons);
router.post('/', authenticate, requireAdmin, createCoupon);
router.delete('/:id', authenticate, requireAdmin, deleteCoupon);

export default router;
