'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ProductCard from '@/components/product/ProductCard';
import {
  ArrowRight, Sparkles, Video, ChevronLeft, ChevronRight,
  Truck, ShieldCheck, CreditCard, RotateCcw, Heart
} from 'lucide-react';

export default function HomePage() {
  const newArrivalsScrollRef = useRef<HTMLDivElement>(null);
  const featuredScrollRef = useRef<HTMLDivElement>(null);

  // Fetch active categories
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data.data),
  });

  // Fetch featured products
  const { data: featuredData } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/api/products?isFeatured=true&limit=12').then((r) => r.data.data),
  });

  // Fetch new arrivals
  const { data: newArrivalsData } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: () => api.get('/api/products?isNewArrival=true&limit=12').then((r) => r.data.data),
  });

  // Fetch TikTok video products
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

  // Determine hero highlight product dynamically from active database inventory
  const heroProduct = featured[0] || newArrivals[0] || null;
  const heroImage = heroProduct?.images?.[0]?.url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800';

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, offset: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* ── Hero Banner ── */}
      <section className="relative bg-gradient-to-br from-rose-100 via-rose-50 to-pink-100 py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14">
          <div className="max-w-xl space-y-6 text-center md:text-left z-10">
            <span className="inline-flex items-center gap-1.5 bg-primary-100 text-primary-800 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs animate-pulse">
              <Sparkles size={14} /> New Festive &amp; Wedding Collection 2026
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-extrabold text-gray-900 leading-tight tracking-tight">
              Grace &amp; Elegance For Every Woman
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
              Discover authentic Nepali traditional &amp; modern ladies' wear. Premium Kurtas, breathtaking Sarees, and gorgeous designer dresses curated in Kathmandu.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
              <Link
                href="/shop"
                className="btn-primary bg-primary-600 hover:bg-primary-700 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-rose-300/50 hover:shadow-xl transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                Shop Collection <ArrowRight size={16} />
              </Link>
              <Link
                href="/#tiktok"
                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-6 py-3.5 rounded-full font-bold text-sm shadow-xs transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>🎵</span> TikTok Videos
              </Link>
            </div>
          </div>

          {/* Dynamic Hero Spotlight Card */}
          <div className="relative w-full max-w-sm sm:max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
            <img
              src={heroImage}
              alt={heroProduct?.name || "GM Collection House Women's Fashion"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
              <p className="text-[11px] uppercase tracking-widest font-bold text-rose-300">
                {heroProduct?.category?.name || 'Featured Collection'}
              </p>
              <p className="text-lg sm:text-xl font-serif font-bold line-clamp-1">
                {heroProduct?.name || 'Designer Festive Collection'}
              </p>
              {heroProduct && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-extrabold text-rose-200">
                    Rs. {Number(heroProduct.discountPrice || heroProduct.price).toLocaleString()}
                  </span>
                  <Link
                    href={`/product/${heroProduct.slug}`}
                    className="text-xs font-bold bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1 rounded-full text-white transition-colors"
                  >
                    View Details →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust & Feature Highlights (Nepali Commerce) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-primary-600 flex items-center justify-center flex-shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Nepal-wide Delivery</p>
              <p className="text-[11px] text-gray-500">Fast shipping via NCM</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-primary-600 flex items-center justify-center flex-shrink-0">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">COD &amp; FonePay</p>
              <p className="text-[11px] text-gray-500">Pay on delivery or QR</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-primary-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">100% Authentic</p>
              <p className="text-[11px] text-gray-500">Premium boutique quality</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-primary-600 flex items-center justify-center flex-shrink-0">
              <Video size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Live Video Draping</p>
              <p className="text-[11px] text-gray-500">Real TikTok video previews</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Categories ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Explore by Category</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Hand-picked styles for everyday elegance and festive celebrations</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] shadow-sm hover:shadow-xl transition-all duration-300 bg-gray-100"
            >
              <img
                src={cat.imageUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500'}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="font-serif font-bold text-base sm:text-lg">{cat.name}</h3>
                <span className="text-xs text-rose-200 flex items-center gap-1 mt-0.5 group-hover:underline">
                  {cat._count?.products ? `${cat._count.products} Styles →` : 'View Styles →'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Sliding New Arrivals Carousel (Mobile Touch Swipe + Desktop Controls) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 mb-1">
              <Sparkles size={14} /> Fresh Off The Runway
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">New Arrivals</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Swipe to explore the newest festive additions at GM Collection House
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Left/Right scroll controls */}
            <button
              onClick={() => scrollContainer(newArrivalsScrollRef, -320)}
              className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 items-center justify-center transition-colors shadow-xs"
              aria-label="Previous products"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scrollContainer(newArrivalsScrollRef, 320)}
              className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 items-center justify-center transition-colors shadow-xs"
              aria-label="Next products"
            >
              <ChevronRight size={18} />
            </button>
            <Link
              href="/shop?new=true"
              className="text-xs sm:text-sm font-bold text-primary-600 hover:text-primary-700 ml-2"
            >
              View All →
            </Link>
          </div>
        </div>

        {/* Sliding Carousel Container */}
        {newArrivals.length > 0 ? (
          <div
            ref={newArrivalsScrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {newArrivals.map((product: any) => (
              <div
                key={product.id}
                className="w-56 sm:w-64 md:w-72 flex-shrink-0 snap-start transition-transform hover:-translate-y-1"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-2">
            <p className="text-gray-600 font-semibold text-sm">Fresh New Arrivals Stocking Soon!</p>
            <p className="text-gray-400 text-xs">New festive kurtas and dresses will appear here.</p>
          </div>
        )}
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
                <div key={product.id} className="bg-gray-800/60 rounded-2xl p-3 border border-gray-700/50 hover:border-rose-500/40 transition-all">
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

      {/* ── Customer Favorites / Featured Collection ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Customer Favorites</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Top-rated and most loved pieces from GM Collection House</p>
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
