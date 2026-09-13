'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, Printer, QrCode,
  CreditCard, Banknote, Smartphone, X, Check,
  Barcode, Volume2, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatNPR } from '@/lib/utils';

// Web Audio API feedback for physical barcode scanner guns
function playPOSBeep(success = true) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1318, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // AudioContext unavailable or blocked by browser policy
  }
}

interface POSItem {
  productId: string;
  variantId?: string;
  productName: string;
  barcode?: string;
  sku?: string;
  imageUrl?: string;
  size?: string;
  color?: string;
  unitPrice: number;
  quantity: number;
  discount: number; // per-item discount in NPR
}

type PaymentMethod = 'CASH' | 'FONEPAY' | 'NEPALPAY';

// ── Receipt Printer ───────────────────────────────────────────────────────────
function printReceipt(sale: any) {
  const lines = [
    '================================',
    '      GM COLLECTION HOUSE       ',
    '   Women\'s Fashion Store Nepal  ',
    '================================',
    `Bill No: ${sale.receiptNumber}`,
    `Date: ${new Date().toLocaleDateString('en-NP')}`,
    `Time: ${new Date().toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}`,
    sale.customerName ? `Customer: ${sale.customerName}` : '',
    '--------------------------------',
    ...sale.items.map((item: POSItem) =>
      `${item.productName.padEnd(16).slice(0, 16)} ${String(item.quantity).padStart(2)}x  Rs.${item.unitPrice.toLocaleString()}`
    ),
    '--------------------------------',
    `Subtotal:        Rs.${sale.subtotal.toLocaleString()}`,
    sale.discountAmount > 0 ? `Discount:       -Rs.${sale.discountAmount.toLocaleString()}` : '',
    '================================',
    `TOTAL:           Rs.${sale.total.toLocaleString()}`,
    `Payment: ${sale.paymentMethod}`,
    sale.paymentMethod === 'CASH'
      ? `Paid: Rs.${sale.amountPaid.toLocaleString()}  Change: Rs.${sale.changeGiven.toLocaleString()}`
      : 'PAID ✓',
    '================================',
    '   Thank you! Visit us again :) ',
    '   gmcollection.com.np          ',
    '================================',
  ].filter(Boolean).join('\n');

  const win = window.open('', '_blank', 'width=350,height=600');
  if (win) {
    win.document.write(`<pre style="font-family:monospace;font-size:13px;margin:16px;">${lines}</pre>`);
    win.document.close();
    win.print();
  }
}

// ── Main POS Page ─────────────────────────────────────────────────────────────
export default function POSPage() {
  const [items,         setItems]         = useState<POSItem[]>([]);
  const [search,        setSearch]        = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid,    setAmountPaid]    = useState('');
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billDiscount,  setBillDiscount]  = useState(0); // bill-level discount %
  const [lastSale,      setLastSale]      = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Product search
  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['pos-search', search],
    queryFn:  () => adminApi.get(`/api/pos/products?q=${encodeURIComponent(search)}`).then((r) => r.data.data),
    enabled:  search.length >= 2,
  });

  // Add item to cart
  const addItem = useCallback((product: any, variant?: any) => {
    const key = `${product.id}-${variant?.id || 'default'}`;
    setItems((prev) => {
      const existing = prev.find((i) => `${i.productId}-${i.variantId || 'default'}` === key);
      if (existing) {
        return prev.map((i) =>
          `${i.productId}-${i.variantId || 'default'}` === key
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, {
        productId:   product.id,
        variantId:   variant?.id,
        productName: product.name,
        barcode:     product.barcode,
        sku:         product.sku,
        imageUrl:    product.images?.[0]?.url,
        size:        variant?.size,
        color:       variant?.color,
        unitPrice:   Number(variant?.price || product.discountPrice || product.price),
        quantity:    1,
        discount:    0,
      }];
    });
    setSearch('');
    searchRef.current?.focus();
  }, []);

  // Calculations
  const subtotal       = items.reduce((s, i) => s + (i.unitPrice - i.discount) * i.quantity, 0);
  const billDiscountAmt = Math.round(subtotal * (billDiscount / 100));
  const total          = subtotal - billDiscountAmt;
  const change         = paymentMethod === 'CASH' ? Math.max(0, Number(amountPaid) - total) : 0;

  // Submit sale
  const saleMutation = useMutation({
    mutationFn: () =>
      adminApi.post('/api/pos/sales', {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity:  i.quantity,
          unitPrice: i.unitPrice,
          discount:  i.discount,
        })),
        paymentMethod,
        amountPaid:    paymentMethod === 'CASH' ? Number(amountPaid) : total,
        customerName:  customerName || undefined,
        customerPhone: customerPhone || undefined,
        billDiscount:  billDiscountAmt,
      }).then((r) => r.data.data),
    onSuccess: (sale) => {
      setLastSale(sale);
      printReceipt({ ...sale, items, subtotal, discountAmount: billDiscountAmt, total, paymentMethod, amountPaid: Number(amountPaid), changeGiven: change, customerName });
      toast.success('Sale recorded!');
      // Reset
      setItems([]);
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setBillDiscount(0);
      searchRef.current?.focus();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Sale failed.'),
  });

  // Global shortcut to focus barcode scanner input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === 'F2') && document.activeElement !== searchRef.current) {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Handle physical scanner gun Enter key & instant auto-add
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = search.trim();
      if (!query) return;

      let matches = searchResults;
      if (!matches || matches.length === 0) {
        try {
          const res = await adminApi.get(`/api/pos/products?q=${encodeURIComponent(query)}`);
          matches = res.data?.data || [];
        } catch {
          matches = [];
        }
      }

      if (!matches || matches.length === 0) {
        playPOSBeep(false);
        toast.error(`No product found for barcode/SKU: "${query}"`);
        return;
      }

      // 1. Exact variant SKU match
      let matchedProduct: any = null;
      let matchedVariant: any = null;

      for (const prod of matches) {
        if (prod.variants?.length > 0) {
          const v = prod.variants.find((variantItem: any) =>
            variantItem.sku?.trim().toLowerCase() === query.toLowerCase()
          );
          if (v) {
            matchedProduct = prod;
            matchedVariant = v;
            break;
          }
        }
      }

      // 2. Exact product barcode or SKU match
      if (!matchedProduct) {
        for (const prod of matches) {
          if (
            prod.barcode?.trim().toLowerCase() === query.toLowerCase() ||
            prod.sku?.trim().toLowerCase() === query.toLowerCase()
          ) {
            matchedProduct = prod;
            if (prod.variants?.length === 1) {
              matchedVariant = prod.variants[0];
            }
            break;
          }
        }
      }

      // 3. Fallback: single search result
      if (!matchedProduct && matches.length === 1) {
        matchedProduct = matches[0];
        if (matchedProduct.variants?.length === 1) {
          matchedVariant = matchedProduct.variants[0];
        }
      }

      if (matchedProduct && (matchedVariant || !matchedProduct.variants?.length)) {
        addItem(matchedProduct, matchedVariant);
        playPOSBeep(true);
        const detail = matchedVariant
          ? ` (${[matchedVariant.size, matchedVariant.color, matchedVariant.sku].filter(Boolean).join(' · ')})`
          : '';
        toast.success(`Scanned: ${matchedProduct.name}${detail}`, { duration: 1500 });
        setSearch('');
      } else if (matchedProduct && matchedProduct.variants?.length > 1) {
        playPOSBeep(true);
        toast('Multiple sizes available — select from list below', { icon: '👆' });
      } else {
        playPOSBeep(true);
        toast('Multiple products found — click to select', { icon: '👆' });
      }
    }
  };

  const canSubmit = items.length > 0 && (paymentMethod !== 'CASH' || Number(amountPaid) >= total);

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-4">
      {/* Left — Product search + bill */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Search bar & Barcode scanner ready indicator */}
        <div className="card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Search size={13} className="text-gray-400" />
              Product / Barcode Lookup
            </label>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Barcode size={13} />
              <span>Barcode Gun Ready ⚡</span>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Scan item barcode with scanner gun, type SKU, or search name…"
              className="input pl-9 pr-4 py-2.5 text-sm font-mono tracking-tight"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-0.5">
            <span>💡 Laser/CCD guns fire <kbd className="px-1 py-0.2 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono text-[10px]">Enter</kbd> to add instantly with sound</span>
            <span>Focus shortcut: <kbd className="px-1 py-0.2 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono text-[10px]">/</kbd> or <kbd className="px-1 py-0.2 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono text-[10px]">F2</kbd></span>
          </div>

          {/* Search results dropdown */}
          {search.length >= 2 && (
            <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
              {isFetching && <p className="text-xs text-gray-400 px-3 py-2">Searching…</p>}
              {searchResults?.map((product: any) => (
                <div key={product.id}>
                  {product.variants?.length > 0 ? (
                    // Show each variant
                    product.variants.map((v: any) => (
                      <button
                        key={v.id}
                        onClick={() => addItem(product, v)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                      >
                        <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.url && <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">{v.size && `Size: ${v.size}`} {v.color && `· ${v.color}`} · Stock: {v.stock}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatNPR(v.price || product.price)}</p>
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => addItem(product)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                    >
                      <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                        {product.images?.[0]?.url && <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatNPR(product.price)}</p>
                    </button>
                  )}
                </div>
              ))}
              {!isFetching && searchResults?.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-3 text-center">No products found</p>
              )}
            </div>
          )}
        </div>

        {/* Bill items */}
        <div className="card flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Bill Items</h3>
            {items.length > 0 && (
              <button onClick={() => setItems([])} className="text-xs text-red-400 hover:text-red-600">
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <p className="text-sm">Scan a barcode or search for products to begin</p>
              </div>
            )}
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-3">
                {/* Image */}
                <div className="w-9 h-9 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">
                    {item.size && `${item.size}`}{item.color && ` · ${item.color}`}
                    {' · '}Rs.{item.unitPrice.toLocaleString()}
                  </p>
                </div>
                {/* Item discount */}
                <div className="w-20">
                  <input
                    type="number"
                    placeholder="Disc."
                    value={item.discount || ''}
                    onChange={(e) => setItems((prev) =>
                      prev.map((i, j) => j === idx ? { ...i, discount: Number(e.target.value) || 0 } : i)
                    )}
                    className="input text-xs py-1 text-center"
                    min={0}
                  />
                </div>
                {/* Quantity stepper */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setItems((prev) => prev.map((i, j) => j === idx ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => setItems((prev) => prev.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i))}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                {/* Line total */}
                <p className="text-sm font-semibold text-gray-900 w-20 text-right">
                  {formatNPR((item.unitPrice - item.discount) * item.quantity)}
                </p>
                {/* Remove */}
                <button
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== idx))}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Payment panel */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        {/* Customer info */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Customer (Optional)</h3>
          <input
            type="text"
            placeholder="Customer name"
            className="input text-sm"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone (98XXXXXXXX)"
            className="input text-sm"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        {/* Bill summary */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Bill Summary</h3>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatNPR(subtotal)}</span>
          </div>

          {/* Bill discount */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 flex-1">Discount (%)</span>
            <input
              type="number"
              value={billDiscount || ''}
              onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
              className="input text-sm py-1 w-20 text-center"
              min={0} max={100}
              placeholder="0"
            />
          </div>
          {billDiscountAmt > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Discount Amount</span>
              <span>-{formatNPR(billDiscountAmt)}</span>
            </div>
          )}

          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-bold text-gray-900">TOTAL</span>
            <span className="font-bold text-xl text-primary-600">{formatNPR(total)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Payment Method</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { method: 'CASH',     icon: Banknote,    label: 'Cash' },
              { method: 'FONEPAY',  icon: Smartphone,  label: 'FonePay' },
              { method: 'NEPALPAY', icon: CreditCard,   label: 'NepalPay' },
            ].map(({ method, icon: Icon, label }) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method as PaymentMethod)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                  paymentMethod === method
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {paymentMethod === 'CASH' && (
            <div>
              <label className="label text-xs">Amount Received (Rs.)</label>
              <input
                type="number"
                placeholder={String(total)}
                className="input text-lg font-bold text-center"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
              {Number(amountPaid) >= total && total > 0 && (
                <p className="text-sm text-green-600 font-medium mt-1 text-center">
                  Change: {formatNPR(change)}
                </p>
              )}
            </div>
          )}

          {(paymentMethod === 'FONEPAY' || paymentMethod === 'NEPALPAY') && (
            <div className="flex flex-col items-center gap-2 py-2">
              <QrCode size={60} className="text-gray-300" />
              <p className="text-xs text-gray-500 text-center">
                QR code will appear here after confirming payment
              </p>
            </div>
          )}
        </div>

        {/* Confirm button */}
        <button
          onClick={() => saleMutation.mutate()}
          disabled={!canSubmit || saleMutation.isPending}
          className="btn-primary justify-center py-4 text-base disabled:opacity-40"
        >
          {saleMutation.isPending ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check size={18} />
              Confirm Sale & Print Receipt
            </>
          )}
        </button>
      </div>
    </div>
  );
}
