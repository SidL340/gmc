'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Edit2, Trash2, Eye, EyeOff,
  Upload, Video, Image as ImageIcon, Sparkles, Link,
  X, Check, Barcode, QrCode, Printer, Download, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatNPR } from '@/lib/utils';

// ── Form schema ───────────────────────────────────────────────────────────────
const productSchema = z.object({
  name:           z.string().min(2, 'Product name is required'),
  description:    z.string().min(10, 'Description must be at least 10 characters'),
  shortDesc:      z.string().optional(),
  categoryId:     z.string().min(1, 'Category is required'),
  price:          z.string().min(1, 'Price is required'),
  costPrice:      z.string().optional(),
  discountPrice:  z.string().optional(),
  stock:          z.string().default('0'),
  status:         z.enum(['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'DISCONTINUED']).default('ACTIVE'),
  tiktokUrl:      z.string().optional(),
  isFeatured:     z.boolean().default(false),
  isNewArrival:   z.boolean().default(false),
  autoGenerateAiImage: z.boolean().default(true),
  tags:           z.string().optional(), // comma-separated
});

type ProductFormData = z.infer<typeof productSchema>;

// ── TikTok URL Preview ────────────────────────────────────────────────────────
function TikTokPreview({ url }: { url: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tiktok-preview', url],
    queryFn:  () => adminApi.get(`/api/products/tiktok-preview?url=${encodeURIComponent(url)}`).then((r) => r.data.data),
    enabled:  !!url && url.includes('tiktok.com'),
    retry: false,
  });

  if (!url || !url.includes('tiktok.com')) return null;
  if (isLoading) return <p className="text-xs text-gray-400 mt-1">Fetching TikTok preview…</p>;
  if (isError)   return <p className="text-xs text-red-400 mt-1">Invalid TikTok URL</p>;

  return data ? (
    <div className="mt-2 flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {data.thumbnailUrl && (
        <img src={data.thumbnailUrl} alt="TikTok thumbnail" className="w-14 h-20 object-cover rounded-md" />
      )}
      <div>
        <p className="text-xs font-medium text-gray-900 line-clamp-2">{data.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">@{data.username}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-green-600">
          <Check size={11} /> Valid TikTok video
        </span>
      </div>
    </div>
  ) : null;
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductFormModal({
  product,
  onClose,
}: {
  product?: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => adminApi.get('/api/categories').then((r) => r.data.data),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name:          product.name,
      description:   product.description,
      shortDesc:     product.shortDesc || '',
      categoryId:    product.categoryId,
      price:         String(product.price),
      costPrice:     product.costPrice ? String(product.costPrice) : '',
      discountPrice: product.discountPrice ? String(product.discountPrice) : '',
      stock:         String(product.stock),
      status:        product.status || 'ACTIVE',
      tiktokUrl:     product.tiktokUrl || '',
      isFeatured:    product.isFeatured,
      isNewArrival:  product.isNewArrival,
      autoGenerateAiImage: true,
    } : {
      status: 'ACTIVE',
      autoGenerateAiImage: true,
    },
  });

  const tiktokUrl = watch('tiktokUrl');

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : [],
        price:          parseFloat(data.price),
        costPrice:      data.costPrice ? parseFloat(data.costPrice) : undefined,
        discountPrice:  data.discountPrice ? parseFloat(data.discountPrice) : undefined,
        stock:          parseInt(data.stock),
        status:         data.status || 'ACTIVE',
      };
      if (product) {
        return adminApi.put(`/api/products/${product.id}`, payload);
      }
      return adminApi.post('/api/products', payload);
    },
    onSuccess: async (res) => {
      const productId = res.data.data.id;
      // Upload files if any
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        formData.append('autoAI', String(watch('autoGenerateAiImage')));
        await adminApi.post(`/api/products/${productId}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success(product ? 'Product updated!' : 'Product created! AI image is generating…');
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save product.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="col-span-1 sm:col-span-3">
              <label className="label">Product Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Red Silk Kurta Set" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Category *</label>
              <select {...register('categoryId')} className="input">
                <option value="">Select category</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
            </div>

            <div>
              <label className="label">Stock Quantity</label>
              <input {...register('stock')} type="number" className="input" placeholder="0" />
            </div>

            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input font-medium text-gray-800">
                <option value="ACTIVE">Active (Live in Store)</option>
                <option value="DRAFT">Draft (Hidden)</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Price (NPR) *</label>
              <input {...register('price')} type="number" className="input" placeholder="1200" />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="label">Cost Price</label>
              <input {...register('costPrice')} type="number" className="input" placeholder="800" />
            </div>
            <div>
              <label className="label">Discount Price</label>
              <input {...register('discountPrice')} type="number" className="input" placeholder="999" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Describe the product..." />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input {...register('tags')} className="input" placeholder="kurta, ethnic, wedding, red" />
          </div>

          {/* TikTok URL */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5">
                <span>🎵</span> TikTok Video URL
                <span className="text-xs text-gray-400 font-normal">(optional — paste any TikTok link)</span>
              </span>
            </label>
            <div className="relative">
              <Link size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                {...register('tiktokUrl')}
                className="input pl-9"
                placeholder="https://www.tiktok.com/@user/video/..."
              />
            </div>
            {/* Live TikTok preview */}
            <TikTokPreview url={tiktokUrl || ''} />
          </div>

          {/* Media upload */}
          <div>
            <label className="label">Product Photos / Videos</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Click to upload photos or videos</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, MP4 · Max 10 files</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {previews.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {previews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    {files[i]?.type.startsWith('video/') ? (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Video size={20} className="text-gray-500" />
                      </div>
                    ) : (
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Image toggle */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Auto-generate AI Fashion Image</p>
                <p className="text-xs text-gray-500">AI creates a professional styled photo automatically</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input {...register('autoGenerateAiImage')} type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-gray-200 peer-checked:bg-primary-500 rounded-full transition-colors peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
            </label>
          </div>

          {/* Flags */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('isFeatured')} type="checkbox" className="w-4 h-4 accent-primary-500" />
              <span className="text-sm text-gray-700">Featured Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('isNewArrival')} type="checkbox" className="w-4 h-4 accent-primary-500" />
              <span className="text-sm text-gray-700">New Arrival</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {saveMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                product ? 'Save Changes' : 'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BarcodeQuickModal({ product, onClose }: { product: any; onClose: () => void }) {
  const barcodeUrl = `http://localhost:5000/api/products/${product.id}/barcode`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <Barcode size={18} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Product Barcode</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="text-center space-y-1">
          <p className="font-bold text-gray-900 text-sm line-clamp-2">{product.name}</p>
          <p className="text-xs text-gray-500 font-mono">SKU: {product.sku}</p>
          <p className="text-base font-black text-primary-700 mt-1">
            Rs. {Number(product.discountPrice || product.price).toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl text-center shadow-inner">
          <img
            src={barcodeUrl}
            alt={product.sku}
            className="mx-auto max-h-20 w-auto object-contain"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <a
            href={barcodeUrl}
            download={`${product.sku}-barcode.png`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary flex-1 text-xs justify-center flex items-center gap-1.5"
          >
            <Download size={14} /> Download
          </a>
          <a
            href={`/products/${product.id}/barcode`}
            className="btn-primary flex-1 text-xs justify-center flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={14} /> Print Labels
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Products List Page ────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [showModal,      setShowModal]      = useState(false);
  const [editing,        setEditing]        = useState<any>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<any>(null);
  const [search,         setSearch]         = useState('');
  const [page,           setPage]           = useState(1);
  const [statusFilter,   setStatusFilter]   = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK' | 'DISCONTINUED'>('ALL');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, statusFilter],
    queryFn:  () =>
      adminApi.get(`/api/products?page=${page}&limit=50&search=${search}&sort=createdAt_desc&status=${statusFilter}`)
        .then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/api/products/${id}`),
    onSuccess:  (res) => {
      toast.success(res.data?.message || 'Product deleted.');
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError:    (err: any) => toast.error(err.response?.data?.message || 'Failed to remove product.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.put(`/api/products/${id}`, { status }),
    onSuccess: (_, vars) => {
      toast.success(`Product status set to ${vars.status}`);
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  const toggleAI = async (productId: string) => {
    const t = toast.loading('Generating AI fashion image…');
    try {
      await adminApi.post(`/api/products/${productId}/generate-ai-image`);
      toast.success('AI image generation started! Refresh in ~30 seconds.', { id: t });
    } catch {
      toast.error('AI generation failed.', { id: t });
    }
  };

  const total = data?.pagination?.total ?? 0;
  const limit = data?.pagination?.limit ?? 50;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search by name, SKU, or tags..."
              className="input pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { label: 'All', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
              { label: 'Archived', value: 'DISCONTINUED' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value as any); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === tab.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="btn-primary shrink-0"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">TikTok</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">Loading products…</td>
                </tr>
              )}
              {data?.products?.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  {/* Product */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={16} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{p.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  {/* Category */}
                  <td className="px-4 py-3 text-gray-600">{p.category?.name || '—'}</td>
                  {/* Price */}
                  <td className="px-4 py-3">
                    {p.discountPrice ? (
                      <div>
                        <p className="font-semibold text-primary-600">{formatNPR(p.discountPrice)}</p>
                        <p className="text-xs text-gray-400 line-through">{formatNPR(p.price)}</p>
                      </div>
                    ) : (
                      <p className="font-semibold">{formatNPR(p.price)}</p>
                    )}
                  </td>
                  {/* Stock */}
                  <td className="px-4 py-3">
                    <span className={p.stock <= 5 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {p.stock}
                    </span>
                  </td>
                  {/* TikTok */}
                  <td className="px-4 py-3">
                    {p.tiktokVideoId ? (
                      <a
                        href={p.tiktokUrl || `https://www.tiktok.com/@gmcollectionhouse/video/${p.tiktokVideoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 font-medium hover:bg-pink-100"
                        title="View TikTok Video"
                      >
                        <span>🎵</span> Video
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {/* Status Dropdown / Quick Toggle */}
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      disabled={updateStatusMutation.isPending}
                      onChange={(e) => updateStatusMutation.mutate({ id: p.id, status: e.target.value })}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition-colors appearance-none pr-6 bg-no-repeat bg-[right_0.4rem_center] ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : p.status === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : p.status === 'OUT_OF_STOCK'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundSize: '10px',
                      }}
                      title="Click to change product status"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                      <option value="DISCONTINUED">DISCONTINUED</option>
                    </select>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => toggleAI(p.id)}
                        className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Generate AI fashion image"
                      >
                        <Sparkles size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBarcodeProduct(p)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View / Print barcode"
                      >
                        <Barcode size={15} />
                      </button>
                      <button
                        onClick={() => { setEditing(p); setShowModal(true); }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit product"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Permanently delete "${p.name}"? This action cannot be undone.`)) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Delete product permanently"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && data?.products?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No products found {statusFilter !== 'ALL' ? `with status "${statusFilter}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} products
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data.pagination.totalPages || 1)}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ProductFormModal
          product={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {/* Barcode Quick Modal */}
      {barcodeProduct && (
        <BarcodeQuickModal
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
        />
      )}
    </div>
  );
}
