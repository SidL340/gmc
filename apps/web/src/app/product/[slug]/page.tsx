'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatNPR } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import TikTokEmbed from '@/components/tiktok/TikTokEmbed';
import toast from 'react-hot-toast';
import {
  ShoppingBag, Heart, Truck, ShieldCheck,
  Check, Sparkles, Star
} from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/api/products/${slug}`).then((r) => r.data.data),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: () => api.get(`/api/reviews/${product.id}`).then((r) => r.data.data),
    enabled: !!product?.id,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-xl font-bold">Product not found</p>
        <button onClick={() => router.push('/shop')} className="btn-primary">
          Back to Shop
        </button>
      </div>
    );
  }

  const price = Number(product.price);
  const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
  const currentPrice = selectedVariant?.price ? Number(selectedVariant.price) : (discountPrice || price);
  const discountPercent = discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  const images = product.images?.length
    ? product.images
    : [{ url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600', isAiGenerated: false }];

  const currentImage = images[selectedImageIdx]?.url;
  const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleAddToCart = () => {
    if (availableStock <= 0) {
      toast.error('This item is currently out of stock.');
      return;
    }

    addItem({
      id: `${product.id}-${selectedVariant?.id || 'base'}`,
      productId: product.id,
      variantId: selectedVariant?.id || null,
      name: product.name,
      slug: product.slug,
      image: currentImage,
      size: selectedVariant?.size || null,
      color: selectedVariant?.color || null,
      quantity,
      unitPrice: currentPrice,
      totalPrice: currentPrice * quantity,
      stock: availableStock,
    });

    toast.success(`Added ${quantity}x ${product.name} to cart!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* ── Left: Image Gallery ── */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 shadow-md">
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            {images[selectedImageIdx]?.isAiGenerated && (
              <span className="absolute top-4 left-4 bg-purple-600/90 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 shadow-md">
                <Sparkles size={12} /> AI Stylized Look
              </span>
            )}
            {discountPercent > 0 && (
              <span className="absolute top-4 right-4 bg-primary-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                -{discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img: any, idx: number) => (
                <button
                  key={img.id || idx}
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`relative w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIdx === idx
                      ? 'border-primary-600 ring-2 ring-primary-200'
                      : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Product Info & Actions ── */}
        <div className="space-y-6">
          <div>
            {product.category && (
              <span className="text-xs font-bold tracking-wider text-primary-600 uppercase">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mt-1">
              {product.name}
            </h1>
            <p className="text-xs text-gray-400 mt-1">SKU: {product.sku || 'GMC-PREMIUM'}</p>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {formatNPR(currentPrice)}
            </span>
            {discountPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatNPR(price)}
              </span>
            )}
          </div>

          {/* Variants Selector */}
          {product.variants?.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Select Option (Size / Color)
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-400'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {v.size && `Size: ${v.size}`}
                    {v.color && ` · ${v.color}`}
                    {v.stock <= 0 && ' (Out of stock)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                availableStock > 0 ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={availableStock > 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
              {availableStock > 0 ? `${availableStock} available in stock` : 'Out of Stock'}
            </span>
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-700">Qty:</span>
            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 rounded-l-xl"
              >
                -
              </button>
              <span className="w-10 text-center font-bold text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                className="w-9 h-9 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 rounded-r-xl"
              >
                +
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={availableStock <= 0}
              className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingBag size={18} /> Add to Bag
            </button>
            <button
              onClick={handleBuyNow}
              disabled={availableStock <= 0}
              className="flex-1 py-3.5 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>

          {/* Delivery & Payment Badges */}
          <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2.5">
              <Truck size={18} className="text-primary-600 flex-shrink-0" />
              <span>All Nepal Delivery via NepalCanMove</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-primary-600 flex-shrink-0" />
              <span>Cash on Delivery, FonePay & NepalPay</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-gray-100 pt-6 space-y-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Product Details
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── TIKTOK VIDEO EMBED SECTION (CRITICAL FEATURE) ── */}
      {product.tiktokVideoId && (
        <section className="mt-16 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-3xl p-6 sm:p-10">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <div>
              <span className="inline-flex items-center gap-1 text-primary-600 text-xs font-bold uppercase tracking-wider">
                <span>🎵</span> Authentic Styling Video
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mt-1">
                See it in Action on TikTok
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Watch how this clothing piece moves, shines, and fits on video before buying
              </p>
            </div>

            {/* Embedded TikTok Player */}
            <TikTokEmbed
              videoId={product.tiktokVideoId}
              username={product.tiktokUsername}
              tiktokUrl={product.tiktokUrl}
              title={product.name}
            />
          </div>
        </section>
      )}

      {/* ── Customer Reviews Section ── */}
      <section className="border-t border-gray-200 pt-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900">Customer Reviews</h2>
            <p className="text-xs text-gray-500">
              {reviewsData?.total || 0} reviews · Average rating {reviewsData?.averageRating || 5}/5
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviewsData?.reviews?.map((r: any) => (
            <div key={r.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-900">{r.user?.name || 'Customer'}</span>
                <div className="flex text-amber-400">
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
              </div>
              {r.title && <p className="font-medium text-xs text-gray-800">{r.title}</p>}
              <p className="text-xs text-gray-600 leading-relaxed">{r.comment}</p>
            </div>
          ))}
          {!reviewsData?.reviews?.length && (
            <p className="text-xs text-gray-400 italic">No customer reviews yet. Be the first to review!</p>
          )}
        </div>
      </section>
    </div>
  );
}
