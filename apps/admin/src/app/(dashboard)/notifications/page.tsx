'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, ShoppingBag, Truck, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => adminApi.get('/api/notifications').then((r) => r.data.data),
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => adminApi.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <ShoppingBag className="text-primary-600" size={18} />;
      case 'DELIVERY':
        return <Truck className="text-blue-600" size={18} />;
      default:
        return <Bell className="text-amber-600" size={18} />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Bell className="text-primary-600" size={28} />
            Store Notifications & Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time operational alerts for online orders, dispatch updates, and inventory changes.
          </p>
        </div>

        <span className="text-xs bg-rose-100 text-primary-800 px-3 py-1 rounded-full font-semibold">
          {notifications?.filter((n: any) => !n.isRead).length || 0} Unread
        </span>
      </div>

      <div className="card divide-y divide-gray-100 overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-gray-400">Loading notifications…</div>
        )}

        {notifications?.map((item: any) => (
          <div
            key={item.id}
            className={`p-4 flex items-start justify-between gap-4 transition-colors ${
              item.isRead ? 'bg-white' : 'bg-rose-50/30'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.message}</p>
                <p className="text-[11px] text-gray-400 mt-1">{formatDateTime(item.createdAt)}</p>
              </div>
            </div>

            {!item.isRead && (
              <button
                onClick={() => markRead.mutate(item.id)}
                className="text-xs text-primary-600 hover:text-primary-800 whitespace-nowrap font-medium"
              >
                Mark as read
              </button>
            )}
          </div>
        ))}

        {notifications?.length === 0 && !isLoading && (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-green-500" />
            <p className="font-semibold text-gray-700">All caught up!</p>
            <p className="text-xs text-gray-400">No new notifications at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
