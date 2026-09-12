import { Request, Response } from 'express';
import { chatWithBot, generateProductEmbedding } from '../services/ai.service';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

export const handleChat = async (req: Request, res: Response) => {
  const { message, history = [] } = req.body;
  if (!message) throw new AppError('Message is required', 400);

  const reply = await chatWithBot(message, history);
  res.json({ success: true, data: { reply } });
};

export const handleSemanticSearch = async (req: Request, res: Response) => {
  const { q } = req.body;
  if (!q) throw new AppError('Query is required', 400);

  const query = String(q).trim();

  // Fallback to text search if no embedding or OpenAI key
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query.toLowerCase()] } },
      ],
    },
    include: {
      images: { where: { isPrimary: true } },
      category: true,
    },
    take: 20,
  });

  res.json({ success: true, data: products });
};
