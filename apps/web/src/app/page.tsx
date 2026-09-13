'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ProductCard from '@/components/product/ProductCard';
import { ArrowRight, Sparkles, Video } from 'lucide-react';

const CATEGORIES = [
  { name: 'Kurta & Sets', slug: 'kurta', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500' },
  { name: 'Sarees', slug: 'saree', image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500' },
  { name: 'Lehengas', slug: 'lehenga', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500' },
  { name: 'Western Wear', slug: 'dresses', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500' },
];

export default function HomePage() {
  const { data: featuredData } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/api/products?isFeatured=true&limit=8').then((r) => r.data.data),
  });

  const { data: newArrivalsData } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: () => api.get('/api/products?isNewArrival=true&limit=8').then((r) => r.data.data),
  });

  // Fetch products with TikTok videos for the "As Seen on TikTok" showcase
  const { data: tiktokProductsData } = useQuery({
    queryKey: ['tiktok-products'],
    queryFn: () => api.get('/api/products?limit=12').then((r) => {
      const all = r.data.data?.products || [];
      return all.filter((p: any) => !!p.tiktokVideoId);
    }),
  });

  const featured = featuredData?.products || [];
  const newArrivals = newArrivalsData?.products || [];
  const tiktokProducts = tiktokProductsData || [];

  return (
    <div className="space-y-16 pb-16">
      {/* ── Hero Banner ── */}
      <section className="relative bg-gradient-to-br from-rose-100 via-rose-50 to-pink-100 py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl space-y-6 text-center md:text-left z-10">
            <span className="inline-flex items-center gap-1.5 bg-primary-100 text-primary-800 text-xs font-bold px-3.5 py-1.5 rounded-full">
              <Sparkles size={14} /> New Festive & Wedding Collection
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-extrabold text-gray-900 leading-tight">
              Grace & Elegance For Every Woman
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Discover authentic Nepali traditional & modern ladies' wear. Premium Kurtas, breathtaking Sarees, and gorgeous designer dresses.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
              <Link
                href="/shop"
                className="btn-primary bg-primary-600 hover:bg-primary-700 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-rose-300/50 hover:shadow-xl transition-all flex items-center gap-2"
              >
                Shop Collection <ArrowRight size={16} />
              </Link>
              <Link
                href="/#tiktok"
                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-6 py-3.5 rounded-full font-bold text-sm shadow-sm transition-all flex items-center gap-2"
              >
                <span>🎵</span> TikTok Videos
              </Link>
            </div>
          </div>

          <div className="relative w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800"
              alt="GM Collection House Women's Fashion"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="text-xs uppercase tracking-widest font-semibold text-rose-200">Featured</p>
              <p className="text-lg font-serif font-bold">Designer Embroidered Kurta Sets</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Categories ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Explore by Category</h2>
          <p className="text-sm text-gray-500 mt-1">Hand-picked styles for everyday elegance and celebrations</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${cat.slug}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] shadow-sm hover:shadow-md transition-all"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="font-serif font-bold text-base sm:text-lg">{cat.name}</h3>
                <span className="text-xs text-rose-200 flex items-center gap-1 mt-0.5 group-hover:underline">
                  View Styles →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── As Seen on TikTok Showcase (CRITICAL FEATURE) ── */}
      <section id="tiktok" className="bg-gradient-to-b from-gray-900 to-black text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                <span>🎵</span> Live Video Previews
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold">As Seen On TikTok</h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Watch how our clothes fit, drape, and shine on live videos
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <a
                href="https://www.tiktok.com/@gmcollectionhouse"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors shadow-sm"
              >
                <span>Follow @gmcollectionhouse</span>
                <span className="text-xs">↗</span>
              </a>
              <Link
                href="/shop"
                className="text-xs text-rose-300 hover:text-white font-semibold flex items-center gap-1 border border-rose-500/30 px-4 py-2 rounded-full transition-colors"
              >
                Shop All Styles →
              </Link>
            </div>
          </div>

          {tiktokProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {tiktokProducts.slice(0, 4).map((product: any) => (
                <div key={product.id} className="bg-gray-800/60 rounded-2xl p-3 border border-gray-700/50">
                  <ProductCard product={product} />
                  <Link
                    href={`/product/${product.slug}`}
                    className="mt-3 w-full py-2 bg-primary-600/20 hover:bg-primary-600 text-rose-300 hover:text-white border border-primary-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Video size={13} /> Watch Video Preview
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/40 rounded-2xl p-8 text-center border border-gray-800">
              <p className="text-gray-400 text-sm">
                TikTok video links added to products in the admin panel will showcase here with instant video preview!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── New Arrivals ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">New Arrivals</h2>
            <p className="text-sm text-gray-500 mt-1">Freshly stocked designs from GM Collection House</p>
          </div>
          <Link href="/shop?new=true" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {newArrivals.slice(0, 8).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {newArrivals.length === 0 && (
            <p className="col-span-full text-center py-12 text-gray-400 text-sm">
              Fresh stock arriving soon! Browse our catalog.
            </p>
          )}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Customer Favorites</h2>
            <p className="text-sm text-gray-500 mt-1">Top rated and loved clothing collections</p>
          </div>
          <Link href="/shop" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
            Shop All →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featured.slice(0, 8).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {featured.length === 0 && (
            <p className="col-span-full text-center py-12 text-gray-400 text-sm">
              Discover all products in our catalog.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
