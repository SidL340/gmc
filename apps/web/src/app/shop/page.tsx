'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ProductCard from '@/components/product/ProductCard';
import { Filter, Search, Loader2 } from 'lucide-react';

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const qParam = searchParams.get('q') || '';
  const isNewOnly = searchParams.get('new') === 'true';

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [search, setSearch] = useState(qParam);
  const [page, setPage] = useState(1);

  // Sync state whenever URL query parameters change (e.g. clicking categories in Navbar)
  useEffect(() => {
    setSelectedCategory(categoryParam);
    setPage(1);
  }, [categoryParam]);

  useEffect(() => {
    setSearch(qParam);
    setPage(1);
  }, [qParam]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data.data),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['shop-products', selectedCategory, search, isNewOnly, page],
    queryFn: () => {
      let url = `/api/products?page=${page}&limit=20&sort=createdAt_desc`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (isNewOnly) url += `&isNewArrival=true`;
      return api.get(url).then((r) => r.data.data);
    },
  });

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setPage(1);
    const params = new URLSearchParams();
    if (slug) params.set('category', slug);
    if (search) params.set('q', search);
    if (isNewOnly) params.set('new', 'true');
    router.push(`/shop${params.toString() ? '?' + params.toString() : ''}`);
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSearch('');
    setPage(1);
    router.push('/shop');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
            {isNewOnly ? 'New Arrivals' : 'All Ladies Collections'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse authentic women's fashion in Nepal
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search by name, fabric, style..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-gray-100 border border-transparent focus:border-primary-400 focus:bg-white focus:outline-none transition-all"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Mobile Horizontal Category Pills */}
      <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2">
        <button
          onClick={() => handleCategorySelect('')}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all flex-shrink-0 active:scale-95 ${
            !selectedCategory
              ? 'bg-primary-600 text-white shadow-sm shadow-rose-200'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Clothes
        </button>
        {categories?.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.slug)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all flex-shrink-0 active:scale-95 ${
              selectedCategory === cat.slug
                ? 'bg-primary-600 text-white shadow-sm shadow-rose-200'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Category Sidebar (Desktop only) */}
        <aside className="hidden lg:block w-60 flex-shrink-0 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <Filter size={15} /> Categories
            </h3>
            <div className="flex flex-col gap-1.5 text-xs font-medium">
              <button
                onClick={() => handleCategorySelect('')}
                className={`text-left px-3 py-2 rounded-lg transition-colors ${
                  !selectedCategory
                    ? 'bg-primary-50 text-primary-700 font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Products
              </button>
              {categories?.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === cat.slug
                      ? 'bg-primary-50 text-primary-700 font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="aspect-[3/4] bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 space-y-3">
              <p className="text-lg font-semibold text-gray-800">No products found</p>
              <p className="text-sm text-gray-500">
                Try selecting another category or clearing your search term.
              </p>
              <button
                onClick={handleResetFilters}
                className="btn-primary inline-flex mt-2 px-5 py-2 text-xs font-semibold rounded-full"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-xs font-medium text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}

