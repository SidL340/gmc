import { Router } from 'express';
import {
  searchPOSProducts, createPOSSale, getPOSSales, getPOSSaleReceipt
} from '../controllers/pos.controller';
import { authenticate, requireCashier } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, requireCashier);

router.get('/products', searchPOSProducts);
router.post('/sales', createPOSSale);
router.get('/sales', getPOSSales);
router.get('/sales/:id/receipt', getPOSSaleReceipt);

export default router;
