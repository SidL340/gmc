'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, Eye, ChevronDown, Package,
  Truck, CheckCircle, XCircle, Clock, Printer, Barcode,
  Volume2, Check, X, Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatNPR, formatDateTime, getOrderStatusClass } from '@/lib/utils';
import CameraBarcodeScanner from '@/components/CameraBarcodeScanner';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function ShippingLabelModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['order-label', orderId],
    queryFn: () => adminApi.get(`/api/shipments/${orderId}/label`).then((r) => r.data.data),
  });

  const label = data?.label;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Truck className="text-primary-600" size={18} />
            <h3 className="font-bold text-gray-900 text-sm">NepalCanMove Shipping Label</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">Loading NCM shipping label…</div>
          ) : label ? (
            <div id="printable-shipping-label" className="border-2 border-dashed border-gray-300 rounded-xl p-5 bg-white text-gray-900 space-y-4 font-sans">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="font-bold text-base tracking-wider uppercase">GM COLLECTION HOUSE</h2>
                  <p className="text-[10px] text-gray-500">Official Merchant · Kathmandu, Nepal</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-rose-100 text-primary-800 text-[11px] font-bold rounded">
                    NepalCanMove Express
                  </span>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{label.from_branch?.name} → {label.to_branch?.name}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between border">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Tracking Number</p>
                  <p className="text-sm font-mono font-bold tracking-wider text-gray-900">{data.trackingNumber || label.orderid}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Dest Branch</p>
                  <p className="text-sm font-bold text-primary-700">{label.to_branch?.name || 'DEST'}</p>
                </div>
              </div>

              {/* Scannable Order Barcode */}
              <div className="py-2.5 text-center bg-white border border-gray-100 rounded-lg">
                <img
                  src={`${apiUrl}/api/orders/${orderId}/barcode`}
                  alt="Order Barcode"
                  className="h-12 mx-auto object-contain"
                />
                <p className="text-[10px] font-mono text-gray-400 mt-1">Scan barcode to pack / dispatch</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border-r border-gray-100 pr-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Shipper / From:</p>
                  <p className="font-semibold text-gray-900">{label.from?.name || 'GM Collection House'}</p>
                  <p className="text-gray-600">Hub: {label.from_branch?.name || 'TINKUNE'}</p>
                  <p className="text-gray-600">📞 {label.from?.phone || '9851107555'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Consignee / To:</p>
                  <p className="font-semibold text-gray-900">{label.receiver?.name}</p>
                  <p className="text-gray-600 leading-snug">{label.receiver?.address}</p>
                  <p className="text-gray-600 font-medium">📞 {label.receiver?.phone}</p>
                </div>
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-xs bg-gray-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Package</p>
                  <p className="font-medium text-gray-800 truncate max-w-[200px]">{label.description?.description || 'Apparel'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase">Amount to Collect (COD)</p>
                  <p className="text-base font-bold text-primary-600">
                    {Number(label.cod_charge) > 0 ? `NPR ${Number(label.cod_charge).toLocaleString('en-IN')}` : 'PAID (PREPAID)'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6">Could not load shipping label.</div>
          )}

          <div className="flex gap-3 justify-end mt-6">
            <button onClick={onClose} className="btn-secondary text-xs">
              Close
            </button>
            <button
              onClick={() => window.print()}
              disabled={!label}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Printer size={14} /> Print Shipping Label
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ORDER_STATUSES = [
  'ALL', 'PENDING', 'CONFIRMED', 'PROCESSING',
  'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'CANCELLED', 'RETURNED',
];

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: React.ElementType }[]> = {
  PENDING:   [{ next: 'CONFIRMED',  label: '✓ Confirm Order', icon: CheckCircle }],
  CONFIRMED: [{ next: 'PROCESSING', label: '📦 Start Packing Order', icon: Package }],
  PROCESSING:[{ next: 'PACKED',     label: '🚚 Mark Packed & Request Courier Pickup', icon: Truck }],
  PACKED:    [{ next: 'SHIPPED',    label: '🚀 Handover to Courier (Mark Shipped)', icon: Truck }],
  SHIPPED:   [{ next: 'OUT_FOR_DELIVERY', label: '📍 Out for Delivery', icon: Truck }],
  OUT_FOR_DELIVERY: [{ next: 'DELIVERED', label: '✅ Mark Delivered (COD Collected)', icon: CheckCircle }],
};

function OrderDetailSlider({ order, onClose }: { order: any; onClose: () => void }) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      adminApi.patch(`/api/orders/${order.id}/status`, { status, note }),
    onSuccess: () => {
      toast.success('Order status updated!');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed.'),
  });

  const [showLabelModal, setShowLabelModal] = useState(false);
  const actions = STATUS_ACTIONS[order.status] || [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <p className="font-semibold text-gray-900">{order.orderNumber}</p>
              <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
              <img
                src={`${apiUrl}/api/orders/${order.id}/barcode`}
                alt="Barcode"
                className="h-8 mt-1.5 object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={getOrderStatusClass(order.status)}>{order.status}</span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
            </div>
          </div>

          <div className="flex-1 p-5 space-y-5">
            {/* Customer */}
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer</h4>
              <p className="text-sm text-gray-700">{order.user?.name}</p>
              <p className="text-sm text-gray-500">{order.user?.phone}</p>
            </div>

            {/* Shipping address */}
            {order.shippingAddress && (
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Shipping Address</h4>
                <p className="text-sm text-gray-700">
                  {order.shippingAddress.fullName}<br />
                  {order.shippingAddress.streetAddress}, Ward {order.shippingAddress.ward}<br />
                  {order.shippingAddress.municipality}, {order.shippingAddress.district}<br />
                  {order.shippingAddress.province}<br />
                  📞 {order.shippingAddress.phone}
                </p>
              </div>
            )}

            {/* Items */}
            <div className="card overflow-hidden">
              <h4 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b border-gray-100">
                Order Items ({order.items?.length})
              </h4>
              <div className="divide-y divide-gray-50">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {item.size && `Size: ${item.size}`}{item.color && ` · ${item.color}`}
                        {' · '}Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatNPR(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatNPR(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount</span>
                  <span>-{formatNPR(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span>{Number(order.shippingCharge) === 0 ? 'Free' : formatNPR(order.shippingCharge)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
                <span>Total</span>
                <span className="text-primary-600">{formatNPR(order.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <span className="font-medium">{order.payment?.method || order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Status</span>
                <span className={order.payment?.status === 'PAID' ? 'text-green-600 font-medium' : 'text-amber-600'}>
                  {order.payment?.status || 'PENDING'}
                </span>
              </div>
            </div>

            {/* Tracking & Shipping Label */}
            {order.shipment ? (
              <div className="card p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Delivery Tracking</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Tracking: <span className="font-mono font-medium text-primary-700">{order.shipment.trackingNumber}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Status: <span className="font-semibold text-gray-800">{order.shipment.status}</span></p>
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => setShowLabelModal(true)}
                    className="btn-secondary text-xs flex-1 justify-center py-2 flex items-center gap-1.5"
                  >
                    <Printer size={13} /> View NCM Label
                  </button>
                  {order.shipment.trackingUrl && (
                    <a
                      href={order.shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs flex-1 justify-center py-2 flex items-center gap-1.5"
                    >
                      Track NCM →
                    </a>
                  )}
                </div>
              </div>
            ) : ['CONFIRMED', 'PROCESSING', 'PACKED'].includes(order.status) ? (
              <div className="card p-3 bg-gray-50 border-dashed border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">Shipping Label Preview</span>
                <button
                  onClick={() => setShowLabelModal(true)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <Printer size={13} /> Preview Label
                </button>
              </div>
            ) : null}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Actions</h4>
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.next}
                    onClick={() => updateStatus.mutate({ status: action.next })}
                    disabled={updateStatus.isPending}
                    className="btn-primary w-full justify-center"
                  >
                    <Icon size={15} />
                    {action.label}
                  </button>
                );
              })}
              {!['CANCELLED', 'DELIVERED', 'RETURNED'].includes(order.status) && (
                <button
                  onClick={() => {
                    if (confirm('Cancel this order?')) {
                      updateStatus.mutate({ status: 'CANCELLED', note: 'Cancelled by admin' });
                    }
                  }}
                  className="btn-danger w-full justify-center"
                >
                  <XCircle size={15} /> Cancel Order
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    {showLabelModal && <ShippingLabelModal orderId={order.id} onClose={() => setShowLabelModal(false)} />}
  </>
);
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState<any>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerInitialCamera, setScannerInitialCamera] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, statusFilter, search],
    queryFn:  () =>
      adminApi.get(`/api/orders?page=${page}&limit=25${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}${search ? `&search=${search}` : ''}`)
        .then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search order, customer..."
              className="input pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScannerInitialCamera(true);
              setShowScannerModal(true);
            }}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 border-rose-200 bg-rose-50 text-primary-700 hover:bg-rose-100 font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Camera size={14} />
            <span>Scan via Phone Camera 📱</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerInitialCamera(false);
              setShowScannerModal(true);
            }}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-xs cursor-pointer py-2 px-3.5"
          >
            <Barcode size={15} />
            <span>Bulk Barcode Dispatch</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Order #', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading orders…</td></tr>
              )}
              {data?.orders?.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(order)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-900">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{order.user?.name}</p>
                    <p className="text-xs text-gray-400">{order.user?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order._count?.items || order.items?.length || 0} items</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatNPR(order.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${order.payment?.status === 'PAID' ? 'badge-success' : order.payment?.method === 'COD' ? 'badge-warning' : 'badge-gray'}`}>
                      {order.payment?.method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={getOrderStatusClass(order.status)}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {data?.orders?.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {data.pagination.total} total orders
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
              <span className="text-sm text-gray-600 px-2 py-1.5">Page {page} of {data.pagination.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail slider */}
      {selected && <OrderDetailSlider order={selected} onClose={() => setSelected(null)} />}

      {/* Bulk Dispatch Scanner Modal */}
      {showScannerModal && (
        <BulkOrderScannerModal
          onClose={() => setShowScannerModal(false)}
          initialCameraMode={scannerInitialCamera}
        />
      )}
    </div>
  );
}

function BulkOrderScannerModal({
  onClose,
  initialCameraMode = false,
}: {
  onClose: () => void;
  initialCameraMode?: boolean;
}) {
  const qc = useQueryClient();
  const [action, setAction] = useState<'PACK' | 'SHIP' | 'VERIFY'>('PACK');
  const [inputCode, setInputCode] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(initialCameraMode);
  const [scanLog, setScanLog] = useState<Array<{
    orderNumber: string;
    customerName: string;
    destination?: string;
    itemsCount: number;
    total: number;
    status: string;
    message: string;
    time: string;
    success: boolean;
  }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio synthesizer beep
  const playBeep = (success = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (success) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio not supported
    }
  };

  const processScan = async (codeToScan: string) => {
    const trimmed = codeToScan.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await adminApi.post('/api/orders/scan-action', {
        code: trimmed,
        action,
      });

      const data = res.data;
      const order = data.order;
      const now = new Date().toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      playBeep(!data.alreadyProcessed);
      if (data.alreadyProcessed) {
        toast(data.message, { icon: 'ℹ️' });
      } else {
        toast.success(data.message);
      }

      setScanLog((prev) => [
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          destination: order.destination,
          itemsCount: order.itemsCount,
          total: Number(order.total),
          status: order.status,
          message: data.message,
          time: now,
          success: !data.alreadyProcessed,
        },
        ...prev,
      ]);

      qc.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      playBeep(false);
      const errMsg = err.response?.data?.message || `No order matching "${trimmed}"`;
      toast.error(errMsg);
    } finally {
      setInputCode('');
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-primary-600 flex items-center justify-center">
              <Barcode size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base font-serif flex items-center gap-2">
                Bulk Barcode Dispatch Scanner
                <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-200">
                  Hardware Gun Ready ⚡
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">Scan barcodes in bulk with handheld laser/CCD scanner gun or type manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Mode Pills */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">Select Scanner Target Action:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAction('PACK')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                action === 'PACK'
                  ? 'border-primary-600 bg-rose-50 text-primary-950 font-bold shadow-xs'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">📦</span>
              <p className="text-xs mt-1">1. Scan to Pack</p>
              <p className="text-[10px] text-gray-500 font-normal">Mark packed &amp; push to NCM</p>
            </button>

            <button
              type="button"
              onClick={() => setAction('SHIP')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                action === 'SHIP'
                  ? 'border-primary-600 bg-rose-50 text-primary-950 font-bold shadow-xs'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">🚀</span>
              <p className="text-xs mt-1">2. Scan to Ship</p>
              <p className="text-[10px] text-gray-500 font-normal">Handover to courier rider</p>
            </button>

            <button
              type="button"
              onClick={() => setAction('VERIFY')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                action === 'VERIFY'
                  ? 'border-primary-600 bg-rose-50 text-primary-950 font-bold shadow-xs'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">🔍</span>
              <p className="text-xs mt-1">3. Scan to Verify</p>
              <p className="text-[10px] text-gray-500 font-normal">Inspect details &amp; check status</p>
            </button>
          </div>
        </div>

        {/* Scan Input Area */}
        <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  processScan(inputCode);
                }
              }}
              placeholder="Point scanner gun & pull trigger (or type GMC-1014 and press Enter)..."
              className="input w-full py-3.5 pl-4 pr-24 text-sm font-mono font-bold bg-white ring-2 ring-primary-500/30"
              disabled={isProcessing}
              autoFocus
            />
            <button
              type="button"
              onClick={() => processScan(inputCode)}
              disabled={!inputCode.trim() || isProcessing}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-xs py-1.5 px-3 cursor-pointer"
            >
              {isProcessing ? 'Processing…' : 'Enter ↵'}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3.5 border-rose-200 bg-rose-50 text-primary-700 hover:bg-rose-100 font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Camera size={14} />
              <span>Scan with Phone Camera 📱</span>
            </button>

            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <Volume2 size={13} className="text-primary-600" />
                Audio Beep on scan
              </span>
              <span className="font-mono">
                Scanned: <strong className="text-gray-900">{scanLog.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Scan Activity Log */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800">Batch Scan Log</span>
            {scanLog.length > 0 && (
              <button
                type="button"
                onClick={() => setScanLog([])}
                className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Clear Log
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-2xl">
            {scanLog.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Ready to scan. Pull trigger on parcel label or use phone camera above.
              </div>
            ) : (
              scanLog.map((log, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900">{log.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {log.customerName} {log.destination ? `· ${log.destination}` : ''} · {log.itemsCount} items · {formatNPR(log.total)}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-5 cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      </div>

      {/* Phone Camera Barcode Scanner Viewfinder Modal */}
      {showCameraScanner && (
        <CameraBarcodeScanner
          title={`Phone Camera Dispatch (${action})`}
          subtitle="Align order shipping barcode or parcel tag within frame"
          onScan={(code) => processScan(code)}
          onClose={() => setShowCameraScanner(false)}
          continuous={true}
        />
      )}
    </div>
  );
}
