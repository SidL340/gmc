import { Router } from 'express';
import { getAdminOverview, getUsers, updateUserStatus } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/users', getUsers);
router.patch('/users/:id', updateUserStatus);

export default router;
