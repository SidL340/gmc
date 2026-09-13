'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Edit2, Trash2, FolderTree, Image as ImageIcon,
  Upload, X, Check, Eye, EyeOff, AlertCircle, Sparkles, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';

// ── Zod Schema ─────────────────────────────────────────────────────────────────
const categorySchema = z.object({
  name:        z.string().min(2, 'Category name must be at least 2 characters'),
  slug:        z.string().optional(),
  description: z.string().optional(),
  imageUrl:    z.string().optional(),
  parentId:    z.string().optional(),
  sortOrder:   z.coerce.number().default(0),
  isActive:    z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  parent?: { id: string; name: string; slug: string } | null;
  children?: any[];
  _count?: { products: number };
  createdAt: string;
}

// ── Slugify Helper ─────────────────────────────────────────────────────────────
function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Category Modal (Add / Edit) ────────────────────────────────────────────────
function CategoryModal({
  category,
  allCategories,
  onClose,
}: {
  category?: CategoryItem | null;
  allCategories: CategoryItem[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [manualSlug, setManualSlug] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          imageUrl: category.imageUrl || '',
          parentId: category.parentId || '',
          sortOrder: category.sortOrder || 0,
          isActive: category.isActive ?? true,
        }
      : {
          name: '',
          slug: '',
          description: '',
          imageUrl: '',
          parentId: '',
          sortOrder: 0,
          isActive: true,
        },
  });

  const watchedName = watch('name');
  const watchedImageUrl = watch('imageUrl');

  // Handle image upload to Cloudinary via backend
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminApi.post('/api/categories/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.data?.url) {
        setValue('imageUrl', res.data.data.url);
        toast.success('Category image uploaded to Cloudinary!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload category image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const payload = {
        name: data.name.trim(),
        slug: data.slug?.trim() ? slugifyText(data.slug) : slugifyText(data.name),
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        parentId: data.parentId || null,
        sortOrder: Number(data.sortOrder) || 0,
        isActive: Boolean(data.isActive),
      };

      if (category) {
        return adminApi.put(`/api/categories/${category.id}`, payload);
      }
      return adminApi.post('/api/categories', payload);
    },
    onSuccess: (res) => {
      toast.success(category ? 'Category updated!' : 'Category created successfully!');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save category.');
    },
  });

  // Filter out self and descendants for parent selector to avoid cycles
  const parentOptions = allCategories.filter((c) => !category || c.id !== category.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <FolderTree size={18} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {category ? 'Edit Category' : 'Add New Category'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-5 space-y-4">
          {/* Category Name */}
          <div>
            <label className="label">Category Name *</label>
            <input
              type="text"
              {...register('name')}
              onChange={(e) => {
                register('name').onChange(e);
                if (!manualSlug && !category) {
                  setValue('slug', slugifyText(e.target.value));
                }
              }}
              className="input"
              placeholder="e.g. Kurta & Sets, Anarkali, Sarees, Western Wear..."
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">URL Slug</label>
              <button
                type="button"
                onClick={() => {
                  setManualSlug(false);
                  setValue('slug', slugifyText(watchedName || ''));
                }}
                className="text-[11px] text-primary-600 hover:underline flex items-center gap-1"
              >
                <Sparkles size={11} /> Auto-generate
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400">/shop?category=</span>
              <input
                type="text"
                {...register('slug')}
                onChange={(e) => {
                  setManualSlug(true);
                  register('slug').onChange(e);
                }}
                className="input pl-28 text-xs font-mono"
                placeholder="kurta-sets"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Used in the website URL and search filter links.
            </p>
          </div>

          {/* Parent Category */}
          <div>
            <label className="label">Parent Category (Optional)</label>
            <select {...register('parentId')} className="input text-sm">
              <option value="">None (Top-level Category)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.parent ? `(Sub of ${c.parent.name})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Organize into subcategories like Ethnic Wear &gt; Anarkali Suits.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              {...register('description')}
              rows={2}
              className="input resize-none"
              placeholder="Brief description for homepage cards and SEO metadata..."
            />
          </div>

          {/* Image Upload / URL */}
          <div>
            <label className="label">Category Banner / Image</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  {...register('imageUrl')}
                  className="input flex-1 text-xs"
                  placeholder="Paste image URL or upload below..."
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="btn-secondary text-xs px-3 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Upload size={14} />
                  {uploadingImage ? 'Uploading…' : 'Upload'}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {watchedImageUrl && (
                <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <img
                    src={watchedImageUrl}
                    alt="Category preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setValue('imageUrl', '')}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full text-xs transition-colors"
                    title="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sort Order & Active */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="label">Display Order</label>
              <input
                type="number"
                {...register('sortOrder')}
                className="input"
                placeholder="0"
                min={0}
              />
              <p className="text-[11px] text-gray-400 mt-1">Lower numbers appear first.</p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="label">Storefront Status</label>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-400 border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Active on Storefront</span>
              </label>
              <p className="text-[11px] text-gray-400 mt-1">Show in navbar &amp; customer shop.</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || uploadingImage}
              className="btn-primary flex-1 justify-center"
            >
              {saveMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                category ? 'Save Changes' : 'Create Category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Category Management Page ─────────────────────────────────────────────
export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const qc = useQueryClient();

  // Fetch all categories including inactive for admin
  const { data: categories = [], isLoading } = useQuery<CategoryItem[]>({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.get('/api/categories?all=true').then((r) => r.data.data),
  });

  // Delete Category Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/api/categories/${id}`),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Category deleted.');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete category.');
    },
  });

  // Toggle Active Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.put(`/api/categories/${id}`, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(`Category ${vars.isActive ? 'activated' : 'deactivated'}.`);
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update category status.');
    },
  });

  const handleDelete = (cat: CategoryItem) => {
    const productCount = cat._count?.products || 0;
    const isPermanent = productCount === 0;
    const confirmMessage = isPermanent
      ? `Are you sure you want to permanently delete category "${cat.name}"? This action cannot be undone.`
      : `Category "${cat.name}" currently has ${productCount} product(s) linked to it. Deleting it will DEACTIVATE it so product records stay intact, and it will be removed from customer view. Proceed?`;

    if (window.confirm(confirmMessage)) {
      deleteMutation.mutate(cat.id);
    }
  };

  // Filter categories by search and status
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.slug.toLowerCase().includes(search.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && cat.isActive) ||
      (statusFilter === 'INACTIVE' && !cat.isActive);

    return matchesSearch && matchesStatus;
  });

  const totalProducts = categories.reduce((acc, c) => acc + (c._count?.products || 0), 0);
  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* ── Page Header & Stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <FolderTree className="text-primary-600" size={26} />
            Categories Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize dress styles, kurtas, sarees, and modern collections for customer browsing.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Categories</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{categories.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <FolderTree size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Active on Storefront</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Eye size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Products Assigned</p>
            <p className="text-2xl font-bold text-primary-600 mt-0.5">{totalProducts}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-primary-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* ── Search and Filter Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === tab
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Categories Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Loading categories…
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderTree size={36} className="mx-auto text-gray-300" />
            <p className="text-gray-600 font-medium text-sm">No categories found</p>
            <p className="text-gray-400 text-xs">
              {search ? 'Try adjusting your search query.' : 'Click "Add Category" to create your first dress category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-gray-500 text-xs font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Slug</th>
                  <th className="px-5 py-3.5">Parent</th>
                  <th className="px-5 py-3.5">Products</th>
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Category Name & Image */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                          {cat.imageUrl ? (
                            <img
                              src={cat.imageUrl}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-xs mt-0.5">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                      <a
                        href={`${process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000'}/shop?category=${cat.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-primary-600 inline-flex items-center gap-1 group"
                        title="View on storefront"
                      >
                        <span>{cat.slug}</span>
                        <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>

                    {/* Parent */}
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {cat.parent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                          {cat.parent.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Products Count */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          (cat._count?.products || 0) > 0
                            ? 'bg-rose-50 text-primary-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {cat._count?.products || 0} items
                      </span>
                    </td>

                    {/* Order */}
                    <td className="px-5 py-3.5 text-xs text-gray-500 font-medium">
                      {cat.sortOrder}
                    </td>

                    {/* Status with Quick Toggle */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() =>
                          toggleStatusMutation.mutate({ id: cat.id, isActive: !cat.isActive })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                        title="Click to toggle active status"
                      >
                        {cat.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <CategoryModal
          category={editingCategory}
          allCategories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}
