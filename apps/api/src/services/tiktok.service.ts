/**
 * TikTok Video Integration Utilities
 *
 * Supports all TikTok URL formats:
 *   https://www.tiktok.com/@username/video/7123456789012345678
 *   https://vm.tiktok.com/ZMxxxxxx/   (short link — needs redirect follow)
 *   https://vt.tiktok.com/ZSxxxxxx/
 */

import axios from 'axios';
import { logger } from '../config/logger';

export interface TikTokMeta {
  videoId:    string;
  username:   string;
  embedUrl:   string;
  thumbnailUrl?: string;
  title?:     string;
  authorName?: string;
  rawUrl:     string;
}

/**
 * Parse a standard TikTok video URL and extract video ID + username.
 * Returns null if not a recognised TikTok URL.
 */
export const parseTikTokUrl = (url: string): { videoId: string; username: string } | null => {
  try {
    const parsed = new URL(url);

    // Standard: tiktok.com/@username/video/VIDEOID
    const stdMatch = parsed.pathname.match(/^\/@([\w.]+)\/video\/(\d+)/);
    if (stdMatch) {
      return { username: stdMatch[1], videoId: stdMatch[2] };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Resolve a TikTok short URL (vm.tiktok.com, vt.tiktok.com) to its full URL,
 * then parse it.
 */
export const resolveShortTikTokUrl = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return response.request.res?.responseUrl || url;
  } catch {
    return url;
  }
};

/**
 * Fetch TikTok oEmbed metadata (title, thumbnail, author).
 * Uses TikTok's public oEmbed endpoint — no API key needed.
 */
export const fetchTikTokOEmbed = async (url: string): Promise<{
  title: string;
  authorName: string;
  thumbnailUrl: string;
} | null> => {
  try {
    const response = await axios.get('https://www.tiktok.com/oembed', {
      params: { url },
      timeout: 8000,
    });
    const data = response.data;
    return {
      title:        data.title        || '',
      authorName:   data.author_name  || '',
      thumbnailUrl: data.thumbnail_url || '',
    };
  } catch (err) {
    logger.warn('TikTok oEmbed fetch failed:', err);
    return null;
  }
};

/**
 * Full TikTok URL processor:
 * 1. Resolves short URLs
 * 2. Parses video ID + username
 * 3. Fetches oEmbed metadata
 * 4. Returns embed-ready data
 *
 * Call this when admin saves/updates a product TikTok URL.
 */
export const processTikTokUrl = async (rawUrl: string): Promise<TikTokMeta | null> => {
  let url = rawUrl.trim();

  // Resolve short URLs
  const isShortUrl = /vm\.tiktok\.com|vt\.tiktok\.com/i.test(url);
  if (isShortUrl) {
    url = await resolveShortTikTokUrl(url);
  }

  const parsed = parseTikTokUrl(url);
  if (!parsed) {
    logger.warn(`Could not parse TikTok URL: ${rawUrl}`);
    return null;
  }

  const { videoId, username } = parsed;

  // Build canonical embed URL
  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;

  // Fetch metadata (best-effort)
  const meta = await fetchTikTokOEmbed(url);

  return {
    videoId,
    username,
    embedUrl,
    thumbnailUrl: meta?.thumbnailUrl,
    title:        meta?.title,
    authorName:   meta?.authorName,
    rawUrl:       url,
  };
};

/**
 * Build TikTok embed HTML string — used in API response so frontend
 * can render it directly inside a sandboxed iframe.
 *
 * The TikTok embed iframe is the safest & most reliable approach:
 * - Works without TikTok's embed.js script injection
 * - Can be lazy-loaded
 * - Fully responsive with padding-bottom hack
 */
export const buildTikTokEmbedHtml = (videoId: string): string => {
  return `
<div class="tiktok-embed-wrapper" style="position:relative;padding-bottom:177.77%;height:0;overflow:hidden;max-width:325px;margin:auto;">
  <iframe
    src="https://www.tiktok.com/embed/v2/${videoId}"
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
    allow="autoplay;clipboard-write;encrypted-media;picture-in-picture"
    allowfullscreen
    loading="lazy"
    title="TikTok Product Video"
  ></iframe>
</div>`.trim();
};

/**
 * Validate a pasted TikTok URL before saving
 */
export const isValidTikTokUrl = (url: string): boolean => {
  return /tiktok\.com/i.test(url);
};
