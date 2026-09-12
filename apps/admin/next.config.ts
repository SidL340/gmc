import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'p16-sign-va.tiktokcdn.com' },
      { protocol: 'https', hostname: 'p19-sign.tiktokcdn.com' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3001', 'localhost:5000'] },
  },
};

export default nextConfig;
