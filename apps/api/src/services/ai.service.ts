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

export const chatWithBot = async (
  userMessage: string,
  history:     ChatMessage[] = [],
): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    return "I'm here to help! Unfortunately, I'm not fully configured yet. Please contact the store directly.";
  }

  try {
    // Fetch store info for context
    const settings = await prisma.storeSetting.findMany({
      where: { key: { in: ['storeName', 'storePhone', 'storeAddress', 'storeHours'] } },
    });
    const storeInfo = Object.fromEntries(settings.map((s: any) => [s.key, s.value]));

    const systemPrompt = `You are a helpful shopping assistant for ${storeInfo.storeName || 'GM Collection House'}, 
a women's clothing store in Nepal. You help customers:
- Find the right clothes and sizes
- Check product availability
- Place orders (guide them to the checkout)
- Track existing orders (ask for order number)  
- Answer questions about delivery (we deliver all over Nepal via NepalCanMove)
- Answer questions about payment (FonePay, NepalPay, Cash on Delivery available)
- Tell store information: ${storeInfo.storeAddress || 'Nepal'}, Phone: ${storeInfo.storePhone || 'Contact us'}

Keep responses short, friendly, and in simple English or Nepali if the customer writes in Nepali.
Never make up product information — say "Let me check" and suggest they browse the website.
If they want to order, guide them to add to cart and checkout.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    );

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm sorry, I couldn't understand that. Can you try again?";
  } catch (error) {
    logger.error('Gemini chatbot error:', error);
    return "Sorry, I'm having trouble right now. Please try again or contact the store directly.";
  }
};
