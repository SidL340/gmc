import { Router } from 'express';
import { getStoreSettings, updateStoreSetting } from '../controllers/settings.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getStoreSettings);
router.put('/', authenticate, requireAdmin, updateStoreSetting);

export default router;
