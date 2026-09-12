import { Router } from 'express';
import { fonePayWebhook, nepalPayWebhook, ncmWebhook } from '../controllers/webhook.controller';

const router = Router();

router.post('/fonepay', fonePayWebhook);
router.post('/fonepay/return', fonePayWebhook);
router.get('/fonepay/return', fonePayWebhook);

router.post('/nepalpay', nepalPayWebhook);
router.post('/nepalpay/return', nepalPayWebhook);
router.get('/nepalpay/return', nepalPayWebhook);

router.post('/ncm', ncmWebhook);

export default router;
