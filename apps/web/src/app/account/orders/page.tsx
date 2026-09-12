'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatNPR, formatDate } from '@/lib/utils';
import { Package, Truck, ArrowRight, Clock } from 'lucide-react';

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => api.get('/api/orders').then((r) => r.data.data),
    enabled: isLoggedIn(),
  });

  if (!isLoggedIn()) {
    router.push('/login?redirect=/account/orders');
    return null;
  }

  const orders = ordersData?.orders || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-serif font-bold text-gray-900">My Orders</h1>
        <p className="text-xs text-gray-500 mt-1">
          Track packages and view order history with NepalCanMove
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 hover:border-rose-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <span className="font-mono font-bold text-sm text-gray-900">{order.orderNumber}</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-primary-700">
                    <Clock size={12} /> {order.status}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{formatNPR(order.total)}</span>
                </div>
              </div>

              {/* Items mini list */}
              <div className="flex gap-3 overflow-x-auto py-1">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 flex-shrink-0 bg-gray-50 rounded-xl p-2 border border-gray-100">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white">
                      {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-gray-800 line-clamp-1 max-w-[120px]">{item.productName}</p>
                      <p className="text-gray-400">{item.quantity}x</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500">
                  Payment: <strong>{order.payment?.method || order.paymentMethod}</strong> ({order.payment?.status || 'PENDING'})
                </span>

                <Link
                  href={`/order/${order.id}`}
                  className="btn-primary text-xs py-2 px-4 rounded-xl inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Truck size={14} /> Live Tracking <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 space-y-3">
          <Package className="mx-auto text-gray-300" size={40} />
          <p className="text-base font-semibold text-gray-800">No orders yet</p>
          <p className="text-xs text-gray-500">
            Start shopping our new arrivals and dress collections!
          </p>
          <Link href="/shop" className="btn-primary inline-flex mt-2 px-6 py-2.5 text-xs font-semibold rounded-full">
            Browse Clothes
          </Link>
        </div>
      )}
    </div>
  );
}
