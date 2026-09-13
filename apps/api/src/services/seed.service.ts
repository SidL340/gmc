import { prisma } from '../config/db';
import { logger } from '../config/logger';

export async function autoBootstrapDatabase(): Promise<void> {
  try {
    // Check if initial setup already occurred
    const bootstrapped = await prisma.storeSetting.findUnique({
      where: { key: 'hasBootstrapped' },
    });
    if (bootstrapped) {
      logger.info('📦 Store settings already initialized. Skipping auto-seed.');
      return;
    }

    logger.info('🌱 Initializing boutique settings, superadmin and categories...');

    // 1. Super Admin
    await prisma.user.upsert({
      where: { phone: '9800000000' },
      update: { role: 'SUPER_ADMIN', isVerified: true },
      create: {
        name: 'Store Owner',
        phone: '9800000000',
        email: 'owner@gmcollection.com.np',
        role: 'SUPER_ADMIN',
        isVerified: true,
      },
    });

    // 2. Settings
    const settings = [
      { key: 'hasBootstrapped', value: 'true' },
      { key: 'storeName', value: 'GM Collection House' },
      { key: 'storeTagline', value: "Nepal's Premier Women's Boutique" },
      { key: 'storePhone', value: '+977-9800000000' },
      { key: 'storeEmail', value: 'info@gmcollection.com.np' },
      { key: 'socialFacebook', value: 'https://www.facebook.com/gmcollectionhouse/' },
      { key: 'socialInstagram', value: 'https://www.instagram.com/gmcollectionhouse' },
      { key: 'socialTikTok', value: 'https://www.tiktok.com/@gmcollectionhouse' },
    ];
    for (const s of settings) {
      await prisma.storeSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: s,
      });
    }

    // 3. Categories
    await prisma.category.upsert({
      where: { slug: 'kurta' },
      update: {},
      create: {
        name: 'Kurta & Sets',
        slug: 'kurta',
        description: 'Designer embroidered kurtas, palazzo sets & festive suits',
        imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      },
    });

    await prisma.category.upsert({
      where: { slug: 'saree' },
      update: {},
      create: {
        name: 'Sarees',
        slug: 'saree',
        description: 'Banarasi, Chiffon, Georgette & Silk Sarees',
        imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600',
      },
    });

    await prisma.category.upsert({
      where: { slug: 'lehenga' },
      update: {},
      create: {
        name: 'Lehengas',
        slug: 'lehenga',
        description: 'Bridal & Party wear lehenga choli',
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      },
    });

    logger.info('🎉 Database base setup ready without hardcoded products.');
  } catch (err: any) {
    logger.warn('Database bootstrap check:', { message: err.message });
  }
}
