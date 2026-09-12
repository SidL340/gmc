'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { formatNPR } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addItemToCart = useCartStore((s) => s.addItem);
  const { isLoggedIn } = useAuthStore();

  useEffect(() => {
    async function loadWishlist() {
      setLoading(true);
      if (isLoggedIn()) {
        try {
          const res = await api.get('/api/wishlist');
          if (res.data?.data) {
            setItems(res.data.data.map((w: any) => w.product || w));
          }
        } catch {
          // fallback to localStorage
          loadLocalWishlist();
        }
      } else {
        loadLocalWishlist();
      }
      setLoading(false);
    }

    function loadLocalWishlist() {
      try {
        const stored = localStorage.getItem('gmc-wishlist');
        if (stored) {
          setItems(JSON.parse(stored));
        }
      } catch {
        setItems([]);
      }
    }

    loadWishlist();
  }, []);

  const handleRemove = async (productId: string) => {
    if (isLoggedIn()) {
      try {
        await api.delete(`/api/wishlist/${productId}`);
      } catch {
        // ignore
      }
    }
    const updated = items.filter((item) => item.id !== productId);
    setItems(updated);
    localStorage.setItem('gmc-wishlist', JSON.stringify(updated));
    toast.success('Removed from wishlist');
  };

  const handleMoveToCart = (item: any) => {
    const price = Number(item.discountPrice || item.price || 0);
    addItemToCart({
      id: item.id,
      productId: item.id,
      name: item.name,
      slug: item.slug,
      image: item.images?.[0] || 'https://placehold.co/400x500/pink/white?text=GM+Collection',
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      stock: item.stock || 10,
    });
    toast.success('Added to shopping bag!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/shop" className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Shop
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 flex items-center gap-2.5">
            <Heart className="text-primary-600 fill-primary-600" size={28} />
            My Wishlist
          </h1>
          <p className="text-sm text-gray-500 mt-1">Saved items you love from GM Collection House</p>
        </div>
        <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-primary-500 flex items-center justify-center mx-auto">
            <Heart size={30} />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Your Wishlist is Empty</h3>
          <p className="text-sm text-gray-500">
            Explore our handcrafted Kurtas, Sarees, and Lehengas and save your favorites!
          </p>
          <Link href="/shop" className="btn-primary inline-flex px-8 py-3 rounded-full text-sm font-semibold">
            Explore Collections
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
              <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                <Image
                  src={item.images?.[0] || 'https://placehold.co/400x500/pink/white?text=GM+Collection'}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500 flex items-center justify-center shadow-sm transition-colors"
                  title="Remove from wishlist"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <Link href={`/product/${item.slug}`} className="font-semibold text-sm text-gray-900 hover:text-primary-600 truncate block">
                    {item.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-sm text-gray-900">
                      {formatNPR(item.discountPrice || item.price)}
                    </span>
                    {item.discountPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatNPR(item.price)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleMoveToCart(item)}
                  className="btn-primary w-full py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag size={14} /> Add to Bag
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
