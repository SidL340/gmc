import { Router } from 'express';
import multer from 'multer';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductMedia,
  generateAIImage,
  deleteProductImage,
  getProductBarcode,
  getTikTokPreview,
} from '../controllers/product.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

import os from 'os';
import path from 'path';

const router  = Router();
const upload  = multer({ dest: path.join(os.tmpdir(), 'gmc-uploads') });

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/',                      getProducts);
router.get('/tiktok-preview',        getTikTokPreview);   // Admin helper — preview TikTok before saving
router.get('/:id/barcode',           getProductBarcode);  // Barcode image for tags & print
router.get('/:slug',                 getProduct);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.post('/',                     authenticate, requireAdmin, createProduct);
router.put('/:id',                   authenticate, requireAdmin, updateProduct);
router.delete('/:id',                authenticate, requireAdmin, deleteProduct);

router.post('/:id/images',           authenticate, requireAdmin, upload.array('files', 10), uploadProductMedia);
router.post('/:id/generate-ai-image',authenticate, requireAdmin, generateAIImage);
router.delete('/:id/images/:imageId',authenticate, requireAdmin, deleteProductImage);

export default router;
