import { prisma } from '../config/db';
import { logger } from '../config/logger';

export async function autoBootstrapDatabase(): Promise<void> {
  try {
    const productCount = await prisma.product.count();
    if (productCount > 0) {
      logger.info(`📦 Database connected with ${productCount} active products.`);
      return;
    }

    logger.info('🌱 Empty database detected! Initializing base boutique catalog and settings...');

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
    const kurta = await prisma.category.upsert({
      where: { slug: 'kurta' },
      update: {},
      create: {
        name: 'Kurta & Sets',
        slug: 'kurta',
        description: 'Designer embroidered kurtas, palazzo sets & festive suits',
        imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      },
    });

    const saree = await prisma.category.upsert({
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

    // 4. Initial Active Boutique Piece
    await prisma.product.create({
      data: {
        name: 'Crimson Red Embroidered Silk Kurta Set',
        slug: 'crimson-red-embroidered-silk-kurta-set',
        description: 'Exquisite heavy embroidery silk kurta set with matching organza dupatta and straight pant. Perfect for weddings and festive celebrations.',
        categoryId: kurta.id,
        price: 4500,
        discountPrice: 3800,
        stock: 25,
        status: 'ACTIVE',
        isFeatured: true,
        isNewArrival: true,
        tiktokUrl: 'https://www.tiktok.com/@gmcollectionhouse',
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800', isPrimary: true, isAiGenerated: false, sortOrder: 0 },
          ],
        },
        variants: {
          create: [
            { size: 'M', color: 'Crimson Red', stock: 15, sku: 'GMC-KURTA-M' },
            { size: 'L', color: 'Crimson Red', stock: 10, sku: 'GMC-KURTA-L' },
          ],
        },
      },
    });

    logger.info('🎉 Cloud database successfully bootstrapped with initial boutique data!');
  } catch (err: any) {
    logger.warn('Database bootstrap check:', { message: err.message });
  }
}
