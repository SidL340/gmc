import { Router } from 'express';
import {
  getCategories, getCategoryBySlug, createCategory,
  updateCategory, deleteCategory
} from '../controllers/category.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

router.post('/', authenticate, requireAdmin, createCategory);
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
