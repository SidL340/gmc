'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Store, Phone, MapPin, Globe, Image as ImageIcon,
  Save, Plus, Trash2, Edit2, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';

const SETTING_GROUPS = [
  {
    title: 'Store Information',
    icon: Store,
    keys: [
      { key: 'storeName',     label: 'Store Name',    type: 'text',  placeholder: 'GM Collection House' },
      { key: 'storeTagline',  label: 'Tagline',       type: 'text',  placeholder: 'Nepal\'s Premier Women\'s Fashion' },
      { key: 'storePhone',    label: 'Phone Number',  type: 'tel',   placeholder: '+977-9800000000' },
      { key: 'storePhone2',   label: 'Phone 2',       type: 'tel',   placeholder: '+977-9800000000' },
      { key: 'storeEmail',    label: 'Email',         type: 'email', placeholder: 'info@gmcollection.com.np' },
      { key: 'storeWebsite',  label: 'Website URL',   type: 'url',   placeholder: 'https://gmcollection.com.np' },
    ],
  },
  {
    title: 'Address',
    icon: MapPin,
    keys: [
      { key: 'storeAddress',    label: 'Street Address', type: 'text', placeholder: 'Shop No. XYZ, Street Name' },
      { key: 'storeCity',       label: 'City',           type: 'text', placeholder: 'Kathmandu' },
      { key: 'storeDistrict',   label: 'District',       type: 'text', placeholder: 'Kathmandu' },
      { key: 'storeProvince',   label: 'Province',       type: 'text', placeholder: 'Bagmati' },
      { key: 'storeGoogleMaps', label: 'Google Maps URL',type: 'url',  placeholder: 'https://maps.google.com/...' },
    ],
  },
  {
    title: 'Business Hours',
    icon: Clock,
    keys: [
      { key: 'storeHoursWeekday', label: 'Weekdays',  type: 'text', placeholder: '10:00 AM – 8:00 PM' },
      { key: 'storeHoursWeekend', label: 'Weekends',  type: 'text', placeholder: '10:00 AM – 7:00 PM' },
      { key: 'storeHolidayClosed',label: 'Closed On', type: 'text', placeholder: 'Public holidays' },
    ],
  },
  {
    title: 'Social Media',
    icon: Globe,
    keys: [
      { key: 'socialFacebook',  label: 'Facebook URL',  type: 'url', placeholder: 'https://facebook.com/...' },
      { key: 'socialInstagram', label: 'Instagram URL', type: 'url', placeholder: 'https://instagram.com/...' },
      { key: 'socialTikTok',    label: 'TikTok URL',    type: 'url', placeholder: 'https://tiktok.com/@...' },
      { key: 'socialYoutube',   label: 'YouTube URL',   type: 'url', placeholder: 'https://youtube.com/...' },
    ],
  },
  {
    title: 'Shipping & Delivery',
    icon: Store,
    keys: [
      { key: 'freeShippingThreshold', label: 'Free Shipping Above (NPR)', type: 'number', placeholder: '2000' },
      { key: 'shippingCharge',        label: 'Standard Shipping Charge',  type: 'number', placeholder: '150' },
      { key: 'codAvailable',          label: 'COD Available',             type: 'text',   placeholder: 'true' },
    ],
  },
];

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn:  () => adminApi.get('/api/settings').then((r) => r.data.data),
  });

  // Convert settings array to map
  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.put('/api/settings', { key, value }),
    onSuccess: (_, { key }) => {
      toast.success('Setting saved!');
      qc.invalidateQueries({ queryKey: ['store-settings'] });
      setEditValues((prev) => { const n = { ...prev }; delete n[key]; return n; });
    },
    onError: () => toast.error('Failed to save setting.'),
  });

  const handleSave = (key: string) => {
    const value = editValues[key];
    if (value === undefined) return;
    updateSetting.mutate({ key, value });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-gray-500">
        All store information displayed on the website is managed here. Changes take effect immediately.
      </p>

      {SETTING_GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.title} className="card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
              <Icon size={16} className="text-primary-500" />
              <h3 className="font-semibold text-gray-900 text-sm">{group.title}</h3>
            </div>
            <div className="p-5 space-y-4">
              {group.keys.map(({ key, label, type, placeholder }) => {
                const currentValue = settingsMap[key] || '';
                const isEditing    = key in editValues;
                const displayValue = isEditing ? editValues[key] : currentValue;

                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="label text-xs">{label}</label>
                      <input
                        type={type}
                        value={displayValue}
                        placeholder={placeholder}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleSave(key)}
                        disabled={updateSetting.isPending}
                        className="btn-primary text-xs py-2 px-3 mt-5 flex-shrink-0"
                      >
                        <Save size={13} /> Save
                      </button>
                    )}
                    {!isEditing && currentValue && (
                      <div className="w-16 mt-5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Save all reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Each field saves individually when you modify it. The 'Save' button appears when you start typing.
      </div>
    </div>
  );
}
