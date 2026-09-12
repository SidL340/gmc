'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Plus, Trash2, ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function BannersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('/shop');

  const qc = useQueryClient();

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => adminApi.get('/api/banners').then((r) => r.data.data),
  });

  const createBanner = useMutation({
    mutationFn: () => adminApi.post('/api/banners', {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      isActive: true,
    }),
    onSuccess: () => {
      toast.success('Banner added');
      setShowAddModal(false);
      setTitle('');
      setImageUrl('');
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: () => toast.error('Failed to add banner'),
  });

  const deleteBanner = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/api/banners/${id}`),
    onSuccess: () => {
      toast.success('Banner deleted');
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <ImageIcon className="text-primary-600" size={28} />
            Homepage Banners & CMS
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage promotional hero slides, festival highlights, and seasonal storefront banners.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
          <Plus size={15} /> Add New Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading && (
          <div className="col-span-full py-12 text-center text-gray-400">Loading banners…</div>
        )}
        {banners?.map((banner: any) => (
          <div key={banner.id} className="card overflow-hidden group">
            <div className="relative aspect-[21/9] bg-gray-100 overflow-hidden">
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold ${
                banner.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
              }`}>
                {banner.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{banner.title}</h3>
                {banner.subtitle && <p className="text-xs text-gray-500 mt-0.5">{banner.subtitle}</p>}
                <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary-600 hover:underline flex items-center gap-1 mt-1">
                  Link: {banner.linkUrl} <ExternalLink size={10} />
                </a>
              </div>
              <button
                onClick={() => { if (confirm('Delete this banner?')) deleteBanner.mutate(banner.id); }}
                className="text-gray-400 hover:text-red-500 p-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {banners?.length === 0 && !isLoading && (
          <div className="col-span-full card p-12 text-center text-gray-400">
            No banners created yet. Add one to display on the storefront hero section.
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Add Homepage Banner</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createBanner.mutate(); }} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Banner Title</label>
                <input
                  type="text"
                  placeholder="e.g. Festive Kurta Collection"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Subtitle / Promo Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Up to 30% OFF on Traditional Silk"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Target Click URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createBanner.isPending} className="btn-primary">
                  {createBanner.isPending ? 'Saving…' : 'Add Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
