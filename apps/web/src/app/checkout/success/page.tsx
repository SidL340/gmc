'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, QrCode, ArrowRight, Package } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderNumber = searchParams.get('orderNumber') || 'GMC-ORDER';
  const method = searchParams.get('method') || 'COD';
  const qrUrl = searchParams.get('qrUrl');

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 size={36} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
          Thank You! Your Order is Placed
        </h1>
        <p className="text-sm text-gray-500">
          Order Reference: <span className="font-mono font-bold text-gray-900">{orderNumber}</span>
        </p>
      </div>

      {/* QR Code Section if FonePay or NepalPay */}
      {qrUrl && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md max-w-sm mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary-600 font-bold text-sm">
            <QrCode size={20} />
            <span>Scan to Pay ({method})</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center">
            <img src={qrUrl} alt="Payment QR Code" className="w-56 h-56 object-contain" />
          </div>
          <p className="text-xs text-gray-500">
            Open your mobile banking or digital wallet app, scan this QR, and complete payment.
          </p>
        </div>
      )}

      {method === 'COD' && (
        <div className="bg-rose-50/60 border border-rose-100 p-5 rounded-2xl text-xs text-gray-700 max-w-md mx-auto">
          🚚 <strong>Cash on Delivery:</strong> Our logistics partner <strong>NepalCanMove</strong> will deliver your package. Please keep the exact cash ready at the time of delivery.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Link
          href="/account/orders"
          className="btn-primary px-6 py-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2"
        >
          <Package size={16} /> View My Orders & Tracking
        </Link>
        <Link
          href="/shop"
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-6 py-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2"
        >
          Continue Shopping <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
