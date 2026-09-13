'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { formatNPR } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Truck, ShieldCheck, CreditCard, Banknote,
  CheckCircle, ArrowLeft, QrCode
} from 'lucide-react';

const PROVINCES = [
  { value: 'BAGMATI', label: 'Bagmati Province' },
  { value: 'GANDAKI', label: 'Gandaki Province' },
  { value: 'KOSHI', label: 'Koshi Province' },
  { value: 'MADHESH', label: 'Madhesh Province' },
  { value: 'LUMBINI', label: 'Lumbini Province' },
  { value: 'KARNALI', label: 'Karnali Province' },
  { value: 'SUDURPASHCHIM', label: 'Sudurpashchim Province' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, shippingCharge, total, clearCart } = useCartStore();
  const { isLoggedIn, user } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState('BAGMATI');
  const [district, setDistrict] = useState('Kathmandu');
  const [municipality, setMunicipality] = useState('');
  const [ward, setWard] = useState('1');
  const [streetAddress, setStreetAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'FONEPAY' | 'NEPALPAY'>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.name && !fullName) setFullName(user.name);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user]);

  // Address lookup for logged-in users
  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/api/users/addresses').then((r) => r.data.data),
    enabled: isLoggedIn(),
  });

  // Verify coupon mutation
  const couponMutation = useMutation({
    mutationFn: (code: string) =>
      api.post('/api/coupons/validate', { code, orderAmount: subtotal }).then((r) => r.data.data),
    onSuccess: (data) => {
      setAppliedDiscount(data.discountAmount);
      toast.success(`Coupon applied! Saved ${formatNPR(data.discountAmount)}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    },
  });

  // Submit order mutation
  const orderMutation = useMutation({
    mutationFn: async () => {
      // Create address first
      const addrRes = await api.post('/api/users/addresses', {
        fullName,
        phone,
        province,
        district,
        municipality,
        ward,
        streetAddress,
      });

      const shippingAddressId = addrRes.data.data.id;

      // Create order with cart items from client
      return api.post('/api/orders', {
        shippingAddressId,
        paymentMethod,
        couponCode: appliedDiscount > 0 ? couponCode : undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
        })),
      });
    },
    onSuccess: (res) => {
      clearCart();
      const order = res.data.data.order;
      const payment = res.data.data.payment;

      if (paymentMethod === 'COD') {
        router.push(`/checkout/success?orderNumber=${order.orderNumber}&method=COD`);
      } else {
        // Show QR page or redirect
        router.push(
          `/checkout/success?orderNumber=${order.orderNumber}&method=${paymentMethod}&qrUrl=${encodeURIComponent(
            payment?.qrCodeUrl || ''
          )}`
        );
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Order creation failed.');
    },
  });

  const finalTotal = Math.max(0, total - appliedDiscount);

  if (!mounted) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-medium">Preparing checkout...</p>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold font-serif text-gray-900">Please Login to Complete Checkout</h2>
        <p className="text-xs text-gray-500">
          We use your mobile phone number for instant OTP login and live delivery updates via SMS.
        </p>
        <button
          onClick={() => router.push('/login?redirect=/checkout')}
          className="btn-primary w-full py-3 rounded-full text-sm font-semibold"
        >
          Login with Phone Number
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <button
        onClick={() => router.back()}
        className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1"
      >
        <ArrowLeft size={14} /> Back to Bag
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Delivery Address */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="font-bold text-base text-gray-900">Delivery Address (Nepal)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sita Shrestha"
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Province *</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {PROVINCES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">District *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Kathmandu, Kaski, Morang"
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Municipality / VDC *</label>
                <input
                  type="text"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="e.g. Kathmandu Metropolitan City"
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ward No. *</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address & Landmark *</label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. New Road, near Gate, House #4"
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Payment Method */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h3 className="font-bold text-base text-gray-900">Choose Payment Method</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* COD */}
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-primary-600 bg-rose-50/50 ring-2 ring-primary-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Banknote className="text-primary-600" size={24} />
                  {paymentMethod === 'COD' && <CheckCircle size={16} className="text-primary-600" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Cash on Delivery</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Pay in cash when order arrives</p>
                </div>
              </button>

              {/* FonePay */}
              <button
                type="button"
                onClick={() => setPaymentMethod('FONEPAY')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'FONEPAY'
                    ? 'border-primary-600 bg-rose-50/50 ring-2 ring-primary-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <QrCode className="text-rose-600" size={24} />
                  {paymentMethod === 'FONEPAY' && <CheckCircle size={16} className="text-primary-600" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">FonePay QR</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Instant mobile banking QR</p>
                </div>
              </button>

              {/* NepalPay */}
              <button
                type="button"
                onClick={() => setPaymentMethod('NEPALPAY')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'NEPALPAY'
                    ? 'border-primary-600 bg-rose-50/50 ring-2 ring-primary-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="text-blue-600" size={24} />
                  {paymentMethod === 'NEPALPAY' && <CheckCircle size={16} className="text-primary-600" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">NepalPay</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">ConnectIPS & Cards</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Summary & Place Order */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-3">
            Review Order
          </h3>

          {/* Items mini list */}
          <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="py-2.5 flex justify-between text-xs">
                <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                <span className="font-bold">{formatNPR(item.totalPrice)}</span>
              </div>
            ))}
          </div>

          {/* Coupon input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo / Coupon Code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 text-xs border rounded-xl bg-gray-50 uppercase font-mono"
            />
            <button
              type="button"
              onClick={() => couponCode && couponMutation.mutate(couponCode)}
              disabled={couponMutation.isPending || !couponCode}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-black disabled:opacity-40"
            >
              Apply
            </button>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">{formatNPR(subtotal)}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between text-primary-600 font-semibold">
                <span>Coupon Discount</span>
                <span>-{formatNPR(appliedDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Delivery (NepalCanMove)</span>
              <span>{shippingCharge === 0 ? 'FREE' : formatNPR(shippingCharge)}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-bold text-gray-900">
              <span>Total Payable</span>
              <span className="text-primary-600 text-lg">{formatNPR(finalTotal)}</span>
            </div>
          </div>

          <button
            onClick={() => orderMutation.mutate()}
            disabled={
              orderMutation.isPending ||
              !fullName.trim() ||
              !phone.trim() ||
              !municipality.trim() ||
              !streetAddress.trim()
            }
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-200 transition-all disabled:opacity-40"
          >
            {orderMutation.isPending ? 'Placing Order...' : `Confirm Order · ${formatNPR(finalTotal)}`}
          </button>

          <p className="text-[11px] text-gray-400 text-center">
            By placing your order, you agree to our Terms of Sale and All-Nepal Delivery terms.
          </p>
        </div>
      </div>
    </div>
  );
}
