'use client';

import { useState } from 'react';
import { ExternalLink, Video, Sparkles } from 'lucide-react';

interface TikTokEmbedProps {
  videoId: string;
  username?: string | null;
  tiktokUrl?: string | null;
  title?: string | null;
}

export default function TikTokEmbed({
  videoId,
  username = 'gmcollectionhouse',
  tiktokUrl,
  title,
}: TikTokEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!videoId) return null;

  const targetUrl =
    tiktokUrl || `https://www.tiktok.com/@${username || 'gmcollectionhouse'}/video/${videoId}`;

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl border border-rose-100 overflow-hidden transition-all">
      {/* Header with TikTok branding */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white">
        <div className="flex items-center gap-2">
          {/* Official TikTok SVG Icon */}
          <svg className="w-5 h-5 fill-current text-[#fe2c55]" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46 6.3 6.3 0 0 0 1.86-4.45V8.58a8.28 8.28 0 0 0 4.91 1.57V6.69z" />
          </svg>
          <span className="text-xs font-bold tracking-wide">TikTok Video</span>
        </div>
        <a
          href={`https://www.tiktok.com/@${username || 'gmcollectionhouse'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-rose-300 hover:text-white transition-colors font-medium"
        >
          @{username || 'gmcollectionhouse'}
        </a>
      </div>

      {/* Video Container — 9:16 Aspect Ratio */}
      <div className="relative w-full bg-black overflow-hidden" style={{ paddingBottom: '160%' }}>
        {/* Loading placeholder spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-10 space-y-3">
            <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-medium animate-pulse">Loading TikTok Styling Video…</p>
          </div>
        )}

        {/* Official TikTok Player V1 */}
        <iframe
          src={`https://www.tiktok.com/player/v1/${videoId}`}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          title={title || 'Product TikTok Preview'}
        />
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-rose-50/50 border-t border-rose-100 flex items-center justify-between text-xs text-gray-700">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles size={14} className="text-primary-600 flex-shrink-0" />
          <span className="truncate font-medium">{title || 'Authentic Live Fit & Styling'}</span>
        </div>
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 bg-white px-2.5 py-1 rounded-full border border-primary-200 shadow-xs whitespace-nowrap ml-2 transition-transform hover:scale-105"
        >
          Open in App <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
