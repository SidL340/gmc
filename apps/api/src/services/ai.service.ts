import axios from 'axios';
import { prisma } from '../config/db';
import { uploadToCloudinary } from '../config/cloudinary';
import { logger } from '../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// AI Fashion Image Generator
// Uses Replicate API with FLUX or Stable Diffusion for clothing images
// ─────────────────────────────────────────────────────────────────────────────

const REPLICATE_API = 'https://api.replicate.com/v1/predictions';

/**
 * Generate a professional AI fashion image for a product.
 * 
 * Strategy:
 * 1. Build a fashion-specific prompt from product name + description
 * 2. Call Replicate API (FLUX.1-schnell model — fast & high quality)
 * 3. Poll for result
 * 4. Upload result to Cloudinary
 * 5. Save as product image (marked isAiGenerated = true)
 * 
 * @param productId    - The product to attach the image to
 * @param productName  - Used in prompt
 * @param description  - Used in prompt
 * @param referenceImageUrl - If provided, used for img2img (more accurate)
 */
export const generateAIFashionImage = async (
  productId:        string,
  productName:      string,
  description:      string,
  referenceImageUrl?: string,
): Promise<void> => {
  if (!process.env.REPLICATE_API_TOKEN) {
    logger.warn('REPLICATE_API_TOKEN not set — skipping AI image generation.');
    return;
  }

  try {
    logger.info(`Generating AI fashion image for product: ${productName}`);

    const prompt = buildFashionPrompt(productName, description);

    // Start prediction on Replicate (FLUX.1-schnell)
    const prediction = await axios.post(
      REPLICATE_API,
      {
        version: 'black-forest-labs/flux-schnell', // fast, high quality
        input: {
          prompt,
          aspect_ratio:    '3:4',       // Portrait — perfect for clothing
          output_quality:  90,
          num_outputs:     1,
          go_fast:         true,
          megapixels:      '1',
        },
      },
      {
        headers: {
          Authorization:  `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    const predictionId = prediction.data.id;

    // Poll for completion (max 2 minutes)
    const imageUrl = await pollReplicateResult(predictionId, 120);
    if (!imageUrl) {
      logger.warn(`AI image generation timed out for product ${productId}`);
      return;
    }

    // Download the generated image and upload to Cloudinary
    const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const base64Image = `data:image/webp;base64,${Buffer.from(imageBuffer.data).toString('base64')}`;
    const uploaded    = await uploadToCloudinary(base64Image, 'gmc/ai-fashion-images');

    // Check how many images product already has
    const existingCount = await prisma.productImage.count({ where: { productId } });

    // Save AI image to product
    await prisma.productImage.create({
      data: {
        productId,
        url:          uploaded.url,
        altText:      `${productName} - AI Fashion Preview`,
        isAiGenerated: true,
        isPrimary:    existingCount === 0, // Primary only if no other images
        sortOrder:    existingCount,
        type:         'image',
      },
    });

    logger.info(`✅ AI fashion image saved for product ${productId}: ${uploaded.url}`);
  } catch (error: any) {
    logger.error(`AI image generation failed for ${productId}:`, error?.message || error);
    // Never throw — this is always background/fire-and-forget
  }
};

/**
 * Poll Replicate API until prediction completes or times out
 */
const pollReplicateResult = async (predictionId: string, timeoutSecs: number): Promise<string | null> => {
  const deadline = Date.now() + timeoutSecs * 1000;

  while (Date.now() < deadline) {
    await sleep(3000); // wait 3 seconds between polls

    const response = await axios.get(`${REPLICATE_API}/${predictionId}`, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });

    const { status, output, error } = response.data;

    if (status === 'succeeded' && output?.[0]) {
      return output[0]; // URL of generated image
    }
    if (status === 'failed') {
      logger.error(`Replicate prediction failed: ${error}`);
      return null;
    }
  }
  return null; // timed out
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Build a professional fashion photography prompt for clothing
 */
const buildFashionPrompt = (name: string, description: string): string => {
  // Extract key descriptors from description
  const colors  = extractColors(description);
  const style   = extractStyle(description);

  return [
    `Professional fashion product photography of ${name}`,
    colors.length ? `in ${colors.join(' and ')}` : '',
    style ? `, ${style} style` : '',
    ', worn by a model, clean white studio background,',
    'soft studio lighting, high fashion editorial look,',
    'sharp details, photorealistic, 8K quality,',
    'women\'s clothing, Nepal fashion store product photo',
  ].filter(Boolean).join(' ');
};

const extractColors = (text: string): string[] => {
  const colorList = ['red', 'blue', 'green', 'yellow', 'pink', 'purple', 'black',
    'white', 'orange', 'grey', 'gray', 'brown', 'beige', 'maroon', 'navy',
    'golden', 'silver', 'cream', 'turquoise', 'magenta', 'violet'];
  const lower = text.toLowerCase();
  return colorList.filter((c) => lower.includes(c));
};

const extractStyle = (text: string): string => {
  const styles: Record<string, string> = {
    'kurta':   'traditional South Asian kurta',
    'saree':   'elegant saree',
    'salwar':  'salwar kameez',
    'western': 'modern western',
    'dress':   'casual dress',
    'top':     'casual top',
    'ethnic':  'ethnic traditional',
    'formal':  'formal business',
  };
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(styles)) {
    if (lower.includes(key)) return val;
  }
  return '';
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Semantic Search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate text embedding for a product (for AI search)
 * Uses OpenAI text-embedding-3-small — cheap and fast
 */
export const generateProductEmbedding = async (
  text: string,
): Promise<number[] | null> => {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',
        input: text,
      },
      {
        headers: {
          Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data.data[0].embedding;
  } catch (error) {
    logger.error('Embedding generation failed:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Chatbot
// Uses Google Gemini API — powered by Gemini 1.5 Flash (free tier)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligent Boutique Knowledge & Catalog Engine
// Operates with or without GEMINI_API_KEY — ensures the customer assistant is
// ALWAYS helpful, responsive, and grounded in real inventory!
// ─────────────────────────────────────────────────────────────────────────────
const getBoutiqueSmartResponse = async (
  userMessage: string,
  storeInfo: Record<string, string>,
): Promise<string> => {
  const text = userMessage.toLowerCase().trim();

  // 1. Check for Nepali script
  const hasNepaliScript = /[\u0900-\u097F]/.test(userMessage);
  if (hasNepaliScript) {
    if (text.includes('डेलिभरी') || text.includes('कहिले')) {
      return 'नमस्ते! काठमाडौँ उपत्यकाभित्र २४ देखि ४८ घण्टामा डेलिभरी हुन्छ (रु. १००, रु. २००० माथिको अर्डरमा नि:शुल्क)। उपत्यका बाहिर नेपाल क्यान मुभ (NepalCanMove) मार्फत २-४ दिनमा पुग्छ। क्यास अन डेलिभरी (COD) पनि उपलब्ध छ!';
    }
    if (text.includes('साडी') || text.includes('कुर्ता') || text.includes('प्राइस') || text.includes('कति')) {
      return 'नमस्ते! हामीसँग बनारसी साडी, जर्जेट, कटन र सिल्क कुर्ता सेटहरू सुपथ मूल्यमा उपलब्ध छन्। तपाईं हाम्रो वेबसाइटको "Shop" पेजमा गएर सम्पूर्ण कलेक्सन र साइज हेर्न सक्नुहुन्छ!';
    }
    return 'नमस्ते! GM Collection House मा तपाईंलाई स्वागत छ 🙏 हामीकहाँ नयाँ फेसनका कुर्ता सेट, साडी, लेहेंगा र वेस्टर्न लुगाहरू उपलब्ध छन्। तपाईंलाई कुन प्रकारको पहिरन चाहिएको छ भन्नुहोस् न!';
  }

  // 2. Greetings
  if (/^(hi|hello|hey|namaste|good\s(morning|afternoon|evening)|hola)/i.test(text)) {
    return `Namaste & Welcome to ${storeInfo.storeName || 'GM Collection House'}! 🙏\n\nI am your virtual fashion stylist. I can help you find stunning Kurta Sets, Sarees, Lehengas, check sizes, explain delivery across Nepal, or assist with your order. How can I help you today?`;
  }

  // 3. Delivery / Shipping
  if (text.includes('deliver') || text.includes('shipping') || text.includes('courier') || text.includes('ncm') || text.includes('nepalcanmove')) {
    return `🚚 **Delivery Across Nepal**:\n\n• **Kathmandu Valley**: 24–48 hours (Rs. 100 delivery fee, or **FREE** on orders over Rs. 2,000!)\n• **Outside Valley**: 2–4 business days across all 77 districts via NepalCanMove (Rs. 150)\n• **Tracking**: You will receive SMS & WhatsApp tracking updates as soon as your parcel is dispatched!`;
  }

  // 4. Payment / COD / FonePay
  if (text.includes('pay') || text.includes('cod') || text.includes('fonepay') || text.includes('esewa') || text.includes('khalti') || text.includes('cash')) {
    return `💳 **Payment Methods Accepted**:\n\n• **Cash on Delivery (COD)**: Available nationwide across Nepal\n• **FonePay Dynamic QR**: Pay instantly from any mobile banking app or eSewa\n• **NepalPay / ConnectIPS**: Direct secure bank transfers\n\nPay online at checkout or pay cash when the courier hands you your package!`;
  }

  // 5. Sizing / Measurements
  if (text.includes('size') || text.includes('fitting') || text.includes('measurement') || text.includes('chart') || text.includes('bust')) {
    return `📏 **Standard Ladies' Size Guide**:\n\n• **S (Small)**: Bust 34", Waist 28", Hip 36"\n• **M (Medium)**: Bust 36", Waist 30", Hip 38"\n• **L (Large)**: Bust 38", Waist 32", Hip 40"\n• **XL (Extra Large)**: Bust 40", Waist 34", Hip 42"\n• **XXL**: Bust 42", Waist 36", Hip 44"\n\n*Tip: Most of our Kurta sets come with generous 1.5–2 inch inner margins for easy custom alterations!*`;
  }

  // 6. Returns / Exchange
  if (text.includes('return') || text.includes('exchange') || text.includes('refund') || text.includes('damaged') || text.includes('wrong')) {
    return `🔄 **7-Day Hassle-Free Exchange**:\n\nIf the size doesn't fit or you wish to exchange colors, we offer a 7-day exchange guarantee on all unworn items with tags intact. Simply message our WhatsApp support (+977-9800000000) or initiate an exchange under "My Orders"!`;
  }

  // 7. Order Tracking
  if (text.includes('track') || text.includes('status') || text.includes('where is my order') || text.includes('order number')) {
    return `📦 **Track Your Order**:\n\nYou can track live order status anytime by visiting **My Orders** in the top navigation bar. If you have an Order Number (e.g. GMC-1001), share it here or WhatsApp us at +977-9800000000 for instant live courier status!`;
  }

  // 8. Store Location & Contact
  if (text.includes('location') || text.includes('address') || text.includes('store') || text.includes('shop') || text.includes('phone') || text.includes('contact') || text.includes('where are you')) {
    return `📍 **Store & Boutique Information**:\n\n• **Store**: ${storeInfo.storeName || 'GM Collection House'}\n• **Location**: ${storeInfo.storeAddress || 'Kathmandu, Nepal'}\n• **Hours**: Sunday to Friday, 10:00 AM – 7:30 PM\n• **Phone / WhatsApp**: ${storeInfo.storePhone || '+977-9800000000'}\n\nYou are welcome to visit our boutique in person or order online with doorstep delivery!`;
  }

  // 9. Product inquiries: search active products in database
  let categoryKeyword = '';
  if (text.includes('kurta') || text.includes('kurti') || text.includes('suit')) categoryKeyword = 'kurta';
  else if (text.includes('saree') || text.includes('sari')) categoryKeyword = 'saree';
  else if (text.includes('lehenga') || text.includes('bridal') || text.includes('wedding')) categoryKeyword = 'lehenga';
  else if (text.includes('western') || text.includes('dress') || text.includes('top')) categoryKeyword = 'western';

  const searchQuery = categoryKeyword || text.replace(/[^a-z0-9 ]/g, '').trim().split(' ')[0] || '';

  if (searchQuery.length >= 3) {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { hasSome: [searchQuery] } },
        ],
      },
      include: { category: true },
      take: 3,
    });

    if (products.length > 0) {
      const productList = products.map((p) => {
        const effPrice = p.discountPrice ? Number(p.discountPrice) : Number(p.price);
        return `• **${p.name}** — Rs. ${effPrice.toLocaleString('en-IN')}${p.discountPrice ? ` (Discounted!)` : ''}`;
      }).join('\n');

      return `✨ Here are some featured pieces from our collection:\n\n${productList}\n\nWould you like more details on sizes, or would you like to browse our full catalog in the **Shop** section?`;
    }
  }

  // 10. General Default Response
  return `Thank you for asking! At ${storeInfo.storeName || 'GM Collection House'}, we specialize in premium Kurta Sets, Designer Sarees, Bridal Lehengas, and Western chic wear.\n\nYou can:\n• Browse all items in the **Shop** section\n• Ask me about **sizes**, **delivery times**, or **payment options**\n• Chat with our human stylist anytime on WhatsApp (+977-9800000000)!`;
};

export const chatWithBot = async (
  userMessage: string,
  history:     ChatMessage[] = [],
): Promise<string> => {
  // 1. Fetch store settings for context
  let storeInfo: Record<string, string> = {};
  try {
    const settings = await prisma.storeSetting.findMany({
      where: { key: { in: ['storeName', 'storePhone', 'storeAddress', 'storeHours'] } },
    });
    storeInfo = Object.fromEntries(settings.map((s: any) => [s.key, s.value]));
  } catch (err) {
    logger.warn('Could not fetch store settings for AI context', err);
  }

  // 2. If GEMINI_API_KEY is available, try Gemini Generative AI
  if (process.env.GEMINI_API_KEY) {
    try {
      // Fetch a few active products for grounding
      const sampleProducts = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { name: true, price: true, discountPrice: true, category: { select: { name: true } } },
        take: 8,
      });

      const productCatalogText = sampleProducts
        .map((p) => `- ${p.name} (${p.category?.name}): Rs. ${Number(p.discountPrice || p.price)}`)
        .join('\n');

      const systemPrompt = `You are the friendly, fashionable, and knowledgeable AI Stylist for ${storeInfo.storeName || 'GM Collection House'}, a premier ladies clothing store in Kathmandu, Nepal.
Key details:
- Currency: Nepalese Rupee (NPR / Rs.)
- Delivery: Kathmandu Valley (24-48 hrs, Rs. 100, free over Rs. 2,000); Outside Valley (2-4 days via NepalCanMove, Rs. 150).
- Payment: Cash on Delivery (COD), FonePay Dynamic QR, NepalPay, eSewa.
- Sizes: S (34" bust), M (36"), L (38"), XL (40"), XXL (42").
- Exchange: 7 days hassle-free for unworn items with tags.
- Store location: ${storeInfo.storeAddress || 'Kathmandu, Nepal'}, Phone/WhatsApp: ${storeInfo.storePhone || '+977-9800000000'}.
- Sample live products:
${productCatalogText}

Instructions:
- Keep answers warm, chic, concise, and helpful.
- If the customer writes in Nepali, reply in courteous Nepali.
- Guide customers to add products to bag and proceed to checkout.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...history.map((m) => ({
              role:  m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
            { role: 'user', parts: [{ text: userMessage }] },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature:     0.7,
          },
        },
        { timeout: 9000 },
      );

      const replyText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText) return replyText;
    } catch (error: any) {
      logger.warn('Gemini API request failed or timed out, falling back to Boutique Intelligence Engine', {
        error: error.message,
      });
      // Seamlessly fall through to getBoutiqueSmartResponse
    }
  }

  // 3. Fallback: Intelligent Boutique Knowledge & Catalog Engine
  return getBoutiqueSmartResponse(userMessage, storeInfo);
};
