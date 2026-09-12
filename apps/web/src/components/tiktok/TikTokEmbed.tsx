'use client';

import { ExternalLink, Video } from 'lucide-react';

interface TikTokEmbedProps {
  videoId: string;
  username?: string | null;
  tiktokUrl?: string | null;
  title?: string | null;
}

export default function TikTokEmbed({
  videoId,
  username,
  tiktokUrl,
  title,
}: TikTokEmbedProps) {
  if (!videoId) return null;

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header with TikTok branding */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-900 to-black text-white">
        <div className="flex items-center gap-2">
          {/* TikTok SVG Icon */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46 6.3 6.3 0 0 0 1.86-4.45V8.58a8.28 8.28 0 0 0 4.91 1.57V6.69z" />
          </svg>
          <span className="text-xs font-bold tracking-wide">TikTok Preview</span>
        </div>
        {username && (
          <span className="text-xs text-gray-400 font-medium">@{username}</span>
        )}
      </div>

      {/* Video Container — 9:16 Aspect Ratio */}
      <div className="relative w-full bg-black" style={{ paddingBottom: '160%' }}>
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={title || 'Product TikTok Preview'}
        />
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1.5 truncate">
          <Video size={14} className="text-primary-500 flex-shrink-0" />
          <span className="truncate">{title || 'Watch clothing styling & live fit'}</span>
        </div>
        {tiktokUrl && (
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap ml-2"
          >
            Open in App <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
