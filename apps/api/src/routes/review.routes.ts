import { Router } from 'express';
import { getProductReviews, addReview, deleteReview } from '../controllers/review.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/:productId', getProductReviews);
router.post('/', authenticate, addReview);
router.delete('/:id', authenticate, requireAdmin, deleteReview);

export default router;
