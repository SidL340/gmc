import { Router } from 'express';
import { handleChat, handleSemanticSearch } from '../controllers/ai.controller';

const router = Router();

router.post('/chat', handleChat);
router.post('/search', handleSemanticSearch);

export default router;
