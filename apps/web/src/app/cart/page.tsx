'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { formatNPR } from '@/lib/utils';
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, itemCount, subtotal, shippingCharge, total, updateQuantity, removeItem } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-medium">Loading your shopping bag...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-primary-600 flex items-center justify-center mx-auto">
          <ShoppingBag size={32} />
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900">Your Shopping Bag is Empty</h2>
        <p className="text-sm text-gray-500">
          Discover our latest Kurtas, Sarees, and exclusive festive collections.
        </p>
        <Link href="/shop" className="btn-primary inline-flex px-8 py-3 rounded-full text-sm font-semibold">
          Explore Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
        Shopping Bag ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 shadow-sm overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex gap-4 items-center">
              <div className="w-20 sm:w-24 aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                <img src={item.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400'} alt={item.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <Link href={`/product/${item.slug}`} className="font-semibold text-sm sm:text-base text-gray-900 hover:text-primary-600 truncate block">
                  {item.name}
                </Link>
                {(item.size || item.color) && (
                  <p className="text-xs text-gray-500">
                    {item.size && `Size: ${item.size}`}{item.color && ` · ${item.color}`}
                  </p>
                )}
                <p className="text-sm font-bold text-gray-900">{formatNPR(item.unitPrice)}</p>

                {/* Quantity Controller */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-base font-bold text-gray-900">{formatNPR(item.totalPrice)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-3">
            Order Summary
          </h3>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">{formatNPR(subtotal)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Shipping (NepalCanMove)</span>
              <span>{shippingCharge === 0 ? <span className="text-green-600 font-semibold">Free</span> : formatNPR(shippingCharge)}</span>
            </div>

            {subtotal < 2000 && (
              <p className="text-[11px] text-primary-600 bg-rose-50 p-2 rounded-lg">
                💡 Add {formatNPR(2000 - subtotal)} more for Free Shipping across Nepal!
              </p>
            )}

            <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-bold text-gray-900">
              <span>Total Amount</span>
              <span className="text-primary-600 text-lg">{formatNPR(total)}</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/checkout')}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2"
          >
            Proceed to Checkout <ArrowRight size={16} />
          </button>

          <p className="text-center text-[11px] text-gray-400">
            Secure checkout · COD, FonePay & NepalPay supported
          </p>
        </div>
      </div>
    </div>
  );
}
