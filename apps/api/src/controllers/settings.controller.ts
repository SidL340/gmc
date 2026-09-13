import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { deliveryService } from '../services/delivery.service';

export const getStoreSettings = async (req: Request, res: Response) => {
  const settings = await prisma.storeSetting.findMany();
  const map: Record<string, string> = {};
  settings.forEach((s) => {
    map[s.key] = s.value;
  });

  res.json({ success: true, data: settings, map });
};

// Public settings for customer storefront (safely strips secret keys)
export const getPublicStoreSettings = async (req: Request, res: Response) => {
  const settings = await prisma.storeSetting.findMany();
  const map: Record<string, string> = {};

  // List of sensitive keys that should NEVER be exposed to public visitors
  const SENSITIVE_KEYS = new Set([
    'esewa_secret_key',
    'khalti_secret_key',
    'fonepay_secret_key',
    'ncm_api_token',
    'nepalpay_secret_key',
  ]);

  settings.forEach((s) => {
    if (!SENSITIVE_KEYS.has(s.key)) {
      map[s.key] = s.value;
    }
  });

  res.json({ success: true, data: map });
};

export const updateStoreSetting = async (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key) throw new AppError('Setting key is required', 400);

  const setting = await prisma.storeSetting.upsert({
    where: { key },
    update: { value: String(value ?? '') },
    create: { key, value: String(value ?? '') },
  });

  res.json({ success: true, data: setting });
};

export const bulkUpdateStoreSettings = async (req: Request, res: Response) => {
  const { settings } = req.body;
  if (!settings) throw new AppError('Settings payload is required', 400);

  let entries: Array<{ key: string; value: any }> = [];

  if (Array.isArray(settings)) {
    entries = settings.filter((s) => s && s.key);
  } else if (typeof settings === 'object') {
    entries = Object.entries(settings).map(([key, value]) => ({ key, value }));
  }

  if (entries.length === 0) {
    throw new AppError('No valid settings entries provided', 400);
  }

  const operations = entries.map(({ key, value }) =>
    prisma.storeSetting.upsert({
      where: { key },
      update: { value: String(value ?? '') },
      create: { key, value: String(value ?? '') },
    })
  );

  const results = await prisma.$transaction(operations);

  res.json({
    success: true,
    message: `Successfully updated ${results.length} settings`,
    data: results,
  });
};

export const testNcmConnection = async (req: Request, res: Response) => {
  const { environment, token, fromBranch, baseUrl } = req.body || {};
  const result = await deliveryService.testConnection({
    environment,
    token,
    fromBranch,
    baseUrl,
  });

  res.json(result);
};
