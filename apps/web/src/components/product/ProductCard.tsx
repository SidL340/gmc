'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { formatNPR } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number | string;
    discountPrice?: number | string | null;
    stock: number;
    tiktokVideoId?: string | null;
    category?: { name: string } | null;
    images?: Array<{ url: string; isAiGenerated?: boolean }>;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const price = Number(product.price);
  const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
  const discountPercent = discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  const primaryImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600';
  const isAiGenerated = product.images?.[0]?.isAiGenerated;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: `${product.id}-default`,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage,
      quantity: 1,
      unitPrice: discountPrice || price,
      totalPrice: discountPrice || price,
      stock: product.stock,
    });
    toast.success(`Added ${product.name} to cart!`);
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Image container */}
      <Link href={`/product/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-gray-50">
        <img
          src={primaryImage}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges container */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {/* TikTok badge */}
          {product.tiktokVideoId && (
            <span className="inline-flex items-center gap-1 bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              <span>🎵</span> Video
            </span>
          )}

          {/* Discount badge */}
          {discountPercent > 0 && (
            <span className="bg-primary-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              -{discountPercent}%
            </span>
          )}

          {/* AI generated image badge */}
          {isAiGenerated && (
            <span className="inline-flex items-center gap-1 bg-purple-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
              <Sparkles size={10} /> AI Stylized
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toast.success('Saved to wishlist!');
          }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-primary-600 hover:bg-white shadow-sm transition-all z-10"
        >
          <Heart size={16} />
        </button>

        {/* Quick Add Overlay on desktop hover */}
        <div className="hidden lg:flex absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleQuickAdd}
            disabled={product.stock <= 0}
            className="w-full py-2.5 bg-white hover:bg-primary-600 hover:text-white text-gray-900 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <ShoppingBag size={14} />
            {product.stock <= 0 ? 'Out of Stock' : 'Quick Add'}
          </button>
        </div>
      </Link>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {product.category && (
            <span className="text-[11px] font-semibold tracking-wider text-primary-600 uppercase">
              {product.category.name}
            </span>
          )}
          <Link href={`/product/${product.slug}`}>
            <h3 className="text-sm font-medium text-gray-900 mt-1 line-clamp-2 hover:text-primary-600 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          {discountPrice ? (
            <>
              <span className="text-base font-bold text-gray-900">
                {formatNPR(discountPrice)}
              </span>
              <span className="text-xs text-gray-400 line-through">
                {formatNPR(price)}
              </span>
            </>
          ) : (
            <span className="text-base font-bold text-gray-900">
              {formatNPR(price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
