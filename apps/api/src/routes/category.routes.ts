import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import {
  getCategories, getCategoryBySlug, createCategory,
  updateCategory, deleteCategory, uploadCategoryImage
} from '../controllers/category.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ dest: path.join(os.tmpdir(), 'gmc-uploads') });

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

router.post('/', authenticate, requireAdmin, createCategory);
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);
router.post('/upload-image', authenticate, requireAdmin, upload.single('file'), uploadCategoryImage);

export default router;
