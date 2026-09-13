import { Router } from 'express';
import {
  getStoreSettings,
  getPublicStoreSettings,
  updateStoreSetting,
  bulkUpdateStoreSettings,
  testNcmConnection,
} from '../controllers/settings.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getStoreSettings);
router.get('/public', getPublicStoreSettings);
router.put('/', authenticate, requireAdmin, updateStoreSetting);
router.post('/bulk', authenticate, requireAdmin, bulkUpdateStoreSettings);
router.put('/bulk', authenticate, requireAdmin, bulkUpdateStoreSettings);
router.post('/test-ncm', authenticate, requireAdmin, testNcmConnection);

export default router;
