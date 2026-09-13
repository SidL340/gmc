'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft, Printer, Download, Sparkles, Tag,
  Check, RefreshCw, Copy, ExternalLink, Scissors
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatNPR } from '@/lib/utils';

export default function ProductBarcodePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [copied, setCopied] = useState(false);
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [tagFormat, setTagFormat] = useState<'single' | 'sheet'>('single');

  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-barcode', id],
    queryFn: () => adminApi.get(`/api/products/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const barcodeImageUrl = `${apiUrl}/api/products/${id}/barcode`;
  const effectiveSku = product?.sku || product?.barcode || (product?.id ? `GMC-${product.id.slice(-8).toUpperCase()}` : 'GMC-PRODUCT');

  const handlePrint = () => {
    window.print();
  };

  const handleCopySku = () => {
    if (effectiveSku) {
      navigator.clipboard.writeText(effectiveSku);
      setCopied(true);
      toast.success('SKU copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Generating barcode and price tag…</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl border border-gray-100 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <Tag size={24} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Product Not Found</h2>
        <p className="text-xs text-gray-500">
          The requested product barcode could not be retrieved. It may have been deleted.
        </p>
        <Link href="/products" className="btn-primary inline-flex items-center gap-2 text-xs">
          <ArrowLeft size={14} /> Return to Products
        </Link>
      </div>
    );
  }

  const primaryImage = product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ── Top Bar (Hidden on Print) ── */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Back to products"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="text-primary-600" size={22} />
              Barcode &amp; Price Tag Generator
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Ready-to-print retail tags for GM Collection House boutique clothing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={barcodeImageUrl}
            download={`${effectiveSku}-barcode.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Download PNG
          </a>

          <button
            onClick={handlePrint}
            className="btn-primary text-xs flex items-center gap-2 shadow-md shadow-rose-200"
          >
            <Printer size={15} /> Print Labels
          </button>
        </div>
      </div>

      {/* ── Tag Controls & Configuration (Hidden on Print) ── */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="text-gray-500">Print Layout:</span>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTagFormat('single')}
              className={`px-3 py-1 rounded-md transition-colors ${
                tagFormat === 'single' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Single Tag
            </button>
            <button
              onClick={() => setTagFormat('sheet')}
              className={`px-3 py-1 rounded-md transition-colors ${
                tagFormat === 'sheet' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sheet (8 Multi-Tags)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Scissors size={14} className="text-gray-400" />
          <span>Cut along dashed borders after printing on sticker paper or tag cards.</span>
        </div>
      </div>

      {/* ── Print Content Area ── */}
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm print:border-none print:shadow-none print:p-0">
        {tagFormat === 'single' ? (
          /* Single Luxury Hang Tag Preview */
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
            <div className="w-80 bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 shadow-md print:shadow-none print:border print:border-black print:w-72 print:m-auto">
              {/* Tag Hole punch marker */}
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 mx-auto mb-4 bg-gray-50 flex items-center justify-center print:border-black">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              </div>

              {/* Brand Header */}
              <div className="text-center border-b border-rose-100 pb-3 mb-4">
                <p className="font-serif font-black tracking-widest text-base text-gray-900">
                  GM COLLECTION
                </p>
                <p className="text-[9px] uppercase tracking-widest text-primary-600 font-semibold mt-0.5">
                  House of Women's Fashion · Nepal
                </p>
              </div>

              {/* Product Info */}
              <div className="space-y-1 mb-4 text-center">
                <p className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
                  {product.name}
                </p>
                <p className="text-[11px] text-gray-500 font-medium">
                  {product.category?.name || 'Ladies Collection'}
                </p>
              </div>

              {/* Barcode Image */}
              <div className="bg-white p-2 rounded-lg border border-gray-200 text-center mb-4 print:border-none">
                <img
                  src={barcodeImageUrl}
                  alt={`Barcode for ${effectiveSku}`}
                  className="mx-auto max-h-16 w-auto object-contain"
                />
              </div>

              {/* Price & SKU Box */}
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 print:bg-transparent print:border-black">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-500">M.R.P.:</span>
                  {product.discountPrice ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-primary-700">
                        Rs. {Number(product.discountPrice).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 line-through">
                        Rs. {Number(product.price).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-base font-extrabold text-gray-900">
                      Rs. {Number(product.price).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-center gap-1 font-mono">
                  <span>SKU: {effectiveSku}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center mt-4 text-[9px] text-gray-400 border-t border-gray-100 pt-2 print:border-black">
                Inclusive of all taxes · gmcollection.com.np
              </div>
            </div>

            {/* Product Snapshot Info Card (Hidden on Print) */}
            <div className="print:hidden max-w-sm space-y-4 border-l border-gray-100 pl-8">
              <div className="flex items-center gap-3">
                {primaryImage && (
                  <img
                    src={primaryImage}
                    alt={product.name}
                    className="w-16 h-20 object-cover rounded-xl border border-gray-200"
                  />
                )}
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 text-primary-700 mb-1">
                    {product.category?.name || 'Garment'}
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {effectiveSku}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Stock:</span>
                  <span className="font-semibold text-gray-900">{product.stock} pcs available</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Product Status:</span>
                  <span className="font-semibold text-gray-900 capitalize">{product.status?.toLowerCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">System Barcode:</span>
                  <span className="font-mono text-gray-900 font-bold">{effectiveSku}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-rose-50 p-4 rounded-xl border border-rose-100 space-y-1.5">
                <p className="font-bold text-primary-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary-600" /> Boutique Label Advice
                </p>
                <p className="text-[11px] text-primary-700 leading-relaxed">
                  Print on standard A4 self-adhesive sticker paper or heavy 250gsm card stock for luxury hang tags.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Multi-Tag Sheet Grid Preview (A4 Printable) */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-2 print:gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-3 text-center print:border print:border-black print:shadow-none"
              >
                <p className="font-serif font-black tracking-wider text-xs text-gray-900">
                  GM COLLECTION
                </p>
                <p className="text-[8px] uppercase tracking-widest text-primary-600 font-semibold mb-1">
                  Women's Fashion
                </p>

                <p className="font-bold text-gray-900 text-[11px] truncate mt-1">
                  {product.name}
                </p>

                <img
                  src={barcodeImageUrl}
                  alt={effectiveSku}
                  className="mx-auto h-10 w-auto object-contain my-1"
                />

                <div className="text-center mt-1">
                  <span className="font-bold text-xs text-gray-900">
                    Rs. {Number(product.discountPrice || product.price).toLocaleString()}
                  </span>
                  <p className="text-[9px] font-mono text-gray-500">{effectiveSku}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
