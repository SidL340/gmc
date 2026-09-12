'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatNPR, formatDate } from '@/lib/utils';
import {
  Package, Truck, CheckCircle2, Clock,
  ArrowLeft, MapPin, ExternalLink
} from 'lucide-react';

const STEPS = [
  { key: 'PENDING', label: 'Order Placed' },
  { key: 'CONFIRMED', label: 'Order Confirmed' },
  { key: 'PACKED', label: 'Packed & Ready' },
  { key: 'SHIPPED', label: 'Dispatched via NCM' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function OrderTrackingPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/api/orders/${id}`).then((r) => r.data.data),
  });

  const { data: tracking } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => api.get(`/api/orders/${id}/tracking`).then((r) => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <p className="font-bold">Order not found</p>
        <button onClick={() => router.push('/account/orders')} className="btn-primary">
          View All Orders
        </button>
      </div>
    );
  }

  const currentStepIdx = STEPS.findIndex((s) => s.key === order.status);
  const activeIdx = currentStepIdx === -1 ? 0 : currentStepIdx;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <button
        onClick={() => router.back()}
        className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1"
      >
        <ArrowLeft size={14} /> Back to My Orders
      </button>

      {/* Header card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
          <div>
            <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">Live Delivery Tracking</span>
            <h1 className="text-2xl font-serif font-bold text-gray-900 mt-0.5">{order.orderNumber}</h1>
            <p className="text-xs text-gray-400 mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 size={13} /> {order.status}
            </span>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatNPR(order.total)}</p>
          </div>
        </div>

        {/* Tracking Stepper */}
        <div className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {STEPS.map((step, idx) => {
              const isCompleted = idx <= activeIdx;
              const isCurrent = idx === activeIdx;

              return (
                <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-primary-600 text-white ring-4 ring-rose-100 shadow-md'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold leading-tight ${
                      isCurrent ? 'text-primary-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* NCM Logistics Info */}
        {order.shipment && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <Truck size={16} className="text-primary-600" /> Logistics: NepalCanMove
              </p>
              <p className="text-gray-600">
                Tracking Code: <strong className="font-mono text-gray-900">{order.shipment.trackingNumber || 'Pending'}</strong>
              </p>
              {order.shipment.currentLocation && (
                <p className="text-gray-500">Current Hub: {order.shipment.currentLocation}</p>
              )}
            </div>

            {order.shipment.trackingUrl && (
              <a
                href={order.shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary py-2 px-4 rounded-xl text-xs inline-flex items-center gap-1"
              >
                Track on NCM Portal <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Details breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping address */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <MapPin size={16} className="text-primary-600" /> Delivery Address
          </h3>
          {order.shippingAddress ? (
            <div className="text-xs text-gray-600 space-y-1 leading-relaxed">
              <p className="font-semibold text-gray-900">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.streetAddress}, Ward {order.shippingAddress.ward}</p>
              <p>{order.shippingAddress.municipality}, {order.shippingAddress.district}</p>
              <p>{order.shippingAddress.province}</p>
              <p className="text-gray-900 font-medium pt-1">📞 {order.shippingAddress.phone}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Address recorded on order file.</p>
          )}
        </div>

        {/* Order items */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Package size={16} className="text-primary-600" /> Package Contents ({order.items?.length || 0})
          </h3>
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {order.items?.map((item: any) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-gray-50 overflow-hidden">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-gray-400">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900">{formatNPR(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
