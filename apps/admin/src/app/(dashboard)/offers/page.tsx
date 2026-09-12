'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Trash2, CheckCircle, Percent } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatDate, formatNPR } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function OffersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrder, setMinOrder] = useState(1000);
  const [usageLimit, setUsageLimit] = useState(100);

  const qc = useQueryClient();

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => adminApi.get('/api/coupons').then((r) => r.data.data),
  });

  const createCoupon = useMutation({
    mutationFn: () => adminApi.post('/api/coupons', {
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrder),
      usageLimit: Number(usageLimit),
    }),
    onSuccess: () => {
      toast.success('Coupon created successfully!');
      setShowAddModal(false);
      setCode('');
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create coupon'),
  });

  const deleteCoupon = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/api/coupons/${id}`),
    onSuccess: () => {
      toast.success('Coupon removed');
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Tag className="text-primary-600" size={28} />
            Coupons & Promo Offers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create festive discounts, seasonal promo codes, and customer retention vouchers.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
          <Plus size={15} /> Create New Coupon
        </button>
      </div>

      {/* Coupon Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && (
          <div className="col-span-full py-12 text-center text-gray-400">Loading coupons…</div>
        )}
        {coupons?.map((coupon: any) => (
          <div key={coupon.id} className="card p-5 border-dashed border-2 border-rose-200 bg-gradient-to-br from-rose-50/40 to-white relative flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-base font-bold text-primary-700 bg-rose-100 px-2.5 py-1 rounded-md tracking-wider">
                  {coupon.code}
                </span>
                <p className="text-sm font-semibold text-gray-900 mt-2">
                  {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `NPR ${coupon.discountValue} FLAT OFF`}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete coupon ${coupon.code}?`)) deleteCoupon.mutate(coupon.id);
                }}
                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                title="Delete coupon"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-1 border-t border-gray-100 pt-3">
              <p>Min Order: <strong className="text-gray-700">{formatNPR(coupon.minOrderAmount || 0)}</strong></p>
              <p>Times Used: <strong className="text-gray-700">{coupon.usedCount || 0} / {coupon.usageLimit || 'Unlimited'}</strong></p>
              <p>Created: <span className="text-gray-600">{formatDate(coupon.createdAt)}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Create Promo Coupon</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createCoupon.mutate(); }} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. DASHAIN20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input font-mono uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="input"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (NPR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Value</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Min Order (NPR)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(Number(e.target.value))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Max Usages</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(Number(e.target.value))}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createCoupon.isPending} className="btn-primary">
                  {createCoupon.isPending ? 'Saving…' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
