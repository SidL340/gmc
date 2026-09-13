'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatNPR } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import TikTokEmbed from '@/components/tiktok/TikTokEmbed';
import toast from 'react-hot-toast';
import {
  ShoppingBag, Heart, Truck, ShieldCheck,
  Check, Sparkles, Star, Ruler, X,
} from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeChart, setShowSizeChart] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/api/products/${slug}`).then((r) => r.data.data),
  });

  // Auto-select first in-stock size/variant on load
  useEffect(() => {
    if (product?.variants?.length > 0 && !selectedVariant) {
      const firstInStock = product.variants.find((v: any) => v.stock > 0) || product.variants[0];
      setSelectedVariant(firstInStock);
    }
  }, [product?.variants]);

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

    if (product.variants?.length > 0 && !selectedVariant) {
      toast.error('Please select your size first!');
      return;
    }

    const effectiveSize = selectedVariant?.size || (product.variants?.length ? null : 'Free Size');

    addItem({
      id: `${product.id}-${selectedVariant?.id || 'base'}`,
      productId: product.id,
      variantId: selectedVariant?.id || null,
      name: product.name,
      slug: product.slug,
      image: currentImage,
      size: effectiveSize,
      color: selectedVariant?.color || null,
      quantity,
      unitPrice: currentPrice,
      totalPrice: currentPrice * quantity,
      stock: availableStock,
    });

    toast.success(`Added ${quantity}x ${product.name}${effectiveSize ? ` (${effectiveSize})` : ''} to bag!`);
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

          {/* ── Size & Option Selector ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Select Size:
                </span>
                <span className="text-xs font-black text-primary-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                  {selectedVariant?.size || (product.variants?.length ? 'Choose size' : 'Free Size')}
                </span>
              </div>

              {/* Size Guide Trigger */}
              <button
                type="button"
                onClick={() => setShowSizeChart(true)}
                className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Ruler size={13} />
                <span>Size Chart &amp; Guide</span>
              </button>
            </div>

            {product.variants?.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v: any) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isOutOfStock = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedVariant(v)}
                      className={`min-w-[54px] h-11 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-rose-200 scale-105 ring-2 ring-rose-200'
                          : isOutOfStock
                          ? 'border-gray-200 bg-gray-100 text-gray-400 line-through cursor-not-allowed'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-primary-500 hover:bg-rose-50/60 shadow-2xs'
                      }`}
                    >
                      <span>{v.size}</span>
                      {v.color && <span className="text-[10px] opacity-75 font-normal">({v.color})</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-xs text-gray-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary-900 block">Free Size (Standard Boutique Fit)</span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Comfortably fits bust sizes 34" to 44" with internal stitching margin.
                  </p>
                </div>
              </div>
            )}
          </div>

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

      {/* ── Size Guide Modal ── */}
      {showSizeChart && (
        <SizeGuideModal onClose={() => setShowSizeChart(false)} />
      )}
    </div>
  );
}

// ── Nepali Boutique Size Chart & Guide Modal ─────────────────────────────────
function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'kurta' | 'saree' | 'lehenga'>('kurta');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📏</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base font-serif">Boutique Size Guide</h3>
              <p className="text-[11px] text-gray-500">Standard Nepali Women's Fashion Measurements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('kurta')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'kurta' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Kurta &amp; Suits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saree')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'saree' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sarees &amp; Blouses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lehenga')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'lehenga' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Lehengas
          </button>
        </div>

        {/* Kurta Size Table */}
        {activeTab === 'kurta' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-rose-50 text-primary-900 font-bold">
                  <tr>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Bust (in)</th>
                    <th className="p-2.5">Waist (in)</th>
                    <th className="p-2.5">Hip (in)</th>
                    <th className="p-2.5">Length (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  <tr className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">XS</td>
                    <td className="p-2.5">34"</td>
                    <td className="p-2.5">30"</td>
                    <td className="p-2.5">36"</td>
                    <td className="p-2.5">43"</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">S</td>
                    <td className="p-2.5">36"</td>
                    <td className="p-2.5">32"</td>
                    <td className="p-2.5">38"</td>
                    <td className="p-2.5">44"</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">M</td>
                    <td className="p-2.5">38"</td>
                    <td className="p-2.5">34"</td>
                    <td className="p-2.5">40"</td>
                    <td className="p-2.5">44"</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">L</td>
                    <td className="p-2.5">40"</td>
                    <td className="p-2.5">36"</td>
                    <td className="p-2.5">42"</td>
                    <td className="p-2.5">45"</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">XL</td>
                    <td className="p-2.5">42"</td>
                    <td className="p-2.5">38"</td>
                    <td className="p-2.5">44"</td>
                    <td className="p-2.5">45"</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">XXL</td>
                    <td className="p-2.5">44"</td>
                    <td className="p-2.5">40"</td>
                    <td className="p-2.5">46"</td>
                    <td className="p-2.5">46"</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">3XL</td>
                    <td className="p-2.5">46"</td>
                    <td className="p-2.5">42"</td>
                    <td className="p-2.5">48"</td>
                    <td className="p-2.5">46"</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              💡 Note: All GM Collection House stitched pieces include 2 inches of internal margin for custom tailoring alterations.
            </p>
          </div>
        )}

        {/* Saree Measurements */}
        {activeTab === 'saree' && (
          <div className="space-y-3 text-xs text-gray-700">
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 space-y-2">
              <p className="font-bold text-primary-900">Traditional Saree Dimensions:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Saree Length:</strong> 5.5 meters (fits all body types &amp; heights)</li>
                <li><strong>Blouse Piece:</strong> 0.8 meters unstitched included with matching border</li>
                <li><strong>Fabric Width:</strong> 44 inches standard draping width</li>
              </ul>
            </div>
            <p className="text-[11px] text-gray-500">
              Free Size drape suitable for women of all sizes from XS to 4XL.
            </p>
          </div>
        )}

        {/* Lehenga Measurements */}
        {activeTab === 'lehenga' && (
          <div className="space-y-3 text-xs text-gray-700">
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 space-y-2">
              <p className="font-bold text-primary-900">Lehenga Choli Specifications:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Lehenga Skirt Waist:</strong> Fits up to 42" with adjustable drawstring &amp; latkan</li>
                <li><strong>Lehenga Skirt Length:</strong> 42" to 44" from waist to floor</li>
                <li><strong>Flared Flair (Ghera):</strong> 3.5 to 4.0 meters wide flare</li>
                <li><strong>Dupatta Length:</strong> 2.4 meters heavy embroidered net/organza</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-500">
            Need custom fitting or sizing assistance? Chat with our AI stylist or message on TikTok!
          </p>
        </div>
      </div>
    </div>
  );
}
