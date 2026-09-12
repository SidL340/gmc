import { Router } from 'express';
import {
  getDashboardStats, getExpenses, addExpense, deleteExpense
} from '../controllers/accounting.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/expenses', getExpenses);
router.post('/expenses', addExpense);
router.delete('/expenses/:id', deleteExpense);

export default router;
