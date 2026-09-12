import { PrismaClient, UserRole, ProductStatus, Province } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GM Collection House database...');

  // 1. Super Admin Account
  const adminPhone = '9800000000';
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { role: UserRole.SUPER_ADMIN, isVerified: true },
    create: {
      name: 'Store Owner',
      phone: adminPhone,
      email: 'owner@gmcollection.com.np',
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
    },
  });
  console.log(`Created/Verified Super Admin account for phone: ${admin.phone}`);

  // 2. Store Settings
  const settings = [
    { key: 'storeName', value: 'GM Collection House' },
    { key: 'storeTagline', value: "Nepal's Premier Women's Clothing Store" },
    { key: 'storePhone', value: '+977-9800000000' },
    { key: 'storeEmail', value: 'info@gmcollection.com.np' },
    { key: 'storeAddress', value: 'Kathmandu, Nepal' },
    { key: 'storeHours', value: 'Sunday - Friday: 10:00 AM - 8:00 PM' },
    { key: 'freeShippingThreshold', value: '2000' },
    { key: 'shippingCharge', value: '150' },
  ];

  for (const s of settings) {
    await prisma.storeSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('Store settings configured');

  // 3. Categories
  const categoriesData = [
    {
      name: 'Kurta & Sets',
      slug: 'kurta',
      description: 'Designer embroidered kurtas, palazzo sets & festive suits',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
    },
    {
      name: 'Sarees',
      slug: 'saree',
      description: 'Banarasi, Chiffon, Georgette & Silk Sarees',
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600',
    },
    {
      name: 'Lehengas',
      slug: 'lehenga',
      description: 'Bridal & Party wear lehenga choli',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
    },
    {
      name: 'Western & Dresses',
      slug: 'dresses',
      description: 'Flowy midi dresses, gowns and modern casuals',
      imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600',
    },
  ];

  const categories: any[] = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categories.push(cat);
  }
  console.log('Categories created');

  // 4. Sample Products with TikTok Videos & AI Stylized Images
  const kurtaCat = categories.find((c) => c.slug === 'kurta')!;
  const sareeCat = categories.find((c) => c.slug === 'saree')!;
  const lehengaCat = categories.find((c) => c.slug === 'lehenga')!;
  const dressCat = categories.find((c) => c.slug === 'dresses')!;

  const productsData = [
    {
      name: 'Crimson Red Embroidered Silk Kurta Set',
      slug: 'crimson-red-embroidered-silk-kurta-set',
      description: 'Exquisite heavy embroidery silk kurta set with matching organza dupatta and straight pant. Perfect for Dashain, Tihar, weddings and celebrations.',
      categoryId: kurtaCat.id,
      price: 4500,
      discountPrice: 3800,
      stock: 25,
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      isNewArrival: true,
      tiktokUrl: 'https://www.tiktok.com/@gmcollection/video/7123456789012345678',
      tiktokVideoId: '7123456789012345678',
      tiktokUsername: 'gmcollection',
      images: [
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800', isPrimary: true, isAiGenerated: true },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800', isPrimary: false, isAiGenerated: false },
      ],
      variants: [
        { size: 'S', color: 'Crimson Red', stock: 5 },
        { size: 'M', color: 'Crimson Red', stock: 10 },
        { size: 'L', color: 'Crimson Red', stock: 7 },
        { size: 'XL', color: 'Crimson Red', stock: 3 },
      ],
    },
    {
      name: 'Royal Pastel Peach Georgette Saree',
      slug: 'royal-pastel-peach-georgette-saree',
      description: 'Delicate hand-embroidered stone border saree crafted in feather-light georgette fabric. Comes with an unstitched designer blouse piece.',
      categoryId: sareeCat.id,
      price: 6200,
      discountPrice: 5400,
      stock: 18,
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      isNewArrival: false,
      tiktokUrl: 'https://www.tiktok.com/@gmcollection/video/7234567890123456789',
      tiktokVideoId: '7234567890123456789',
      tiktokUsername: 'gmcollection',
      images: [
        { url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800', isPrimary: true, isAiGenerated: false },
      ],
      variants: [
        { size: 'Free Size', color: 'Pastel Peach', stock: 18 },
      ],
    },
    {
      name: 'Emerald Green Bridal Velvet Lehenga',
      slug: 'emerald-green-bridal-velvet-lehenga',
      description: 'Opulent zardozi and dori embroidered micro-velvet lehenga with double dupatta and flared cancan underlay.',
      categoryId: lehengaCat.id,
      price: 18500,
      discountPrice: 15900,
      stock: 8,
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      isNewArrival: true,
      tiktokUrl: 'https://www.tiktok.com/@gmcollection/video/7345678901234567890',
      tiktokVideoId: '7345678901234567890',
      tiktokUsername: 'gmcollection',
      images: [
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800', isPrimary: true, isAiGenerated: true },
      ],
      variants: [
        { size: 'M', color: 'Emerald Green', stock: 4 },
        { size: 'L', color: 'Emerald Green', stock: 4 },
      ],
    },
    {
      name: 'Floral Chiffon Ruffle Tiered Dress',
      slug: 'floral-chiffon-ruffle-tiered-dress',
      description: 'Breezy feminine floral chiffon midi dress with flutter sleeves and elasticated smocked waist.',
      categoryId: dressCat.id,
      price: 2800,
      discountPrice: 2250,
      stock: 30,
      status: ProductStatus.ACTIVE,
      isFeatured: false,
      isNewArrival: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800', isPrimary: true, isAiGenerated: false },
      ],
      variants: [
        { size: 'S', color: 'Floral Print', stock: 10 },
        { size: 'M', color: 'Floral Print', stock: 10 },
        { size: 'L', color: 'Floral Print', stock: 10 },
      ],
    },
  ];

  for (const p of productsData) {
    const { images, variants, ...productBase } = p;
    const existing = await prisma.product.findUnique({ where: { slug: productBase.slug } });
    if (!existing) {
      await prisma.product.create({
        data: {
          ...productBase,
          sku: `GMC-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          images: { create: images },
          variants: { create: variants },
        },
      });
    }
  }
  console.log('Sample products seeded');

  // 5. Welcome Coupon
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% discount on your first fashion order',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 1000,
      maxDiscount: 500,
      isActive: true,
    },
  });
  console.log('Welcome coupon created: WELCOME10');

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
