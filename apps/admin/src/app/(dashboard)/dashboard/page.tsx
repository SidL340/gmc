'use client';

import {
  ShoppingBag, TrendingUp, Users, Package,
  ArrowUpRight, ArrowDownRight, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatNPR, formatDate } from '@/lib/utils';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  title, value, icon: Icon, change, changeType, color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: string;
  changeType?: 'up' | 'down';
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
        {change && (
          <p className={`text-xs flex items-center gap-1 mt-0.5 ${
            changeType === 'up' ? 'text-green-600' : 'text-red-500'
          }`}>
            {changeType === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change} vs last month
          </p>
        )}
      </div>
    </div>
  );
}

// ── Order Status Badge ────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  PENDING:          'badge-warning',
  CONFIRMED:        'badge-info',
  PROCESSING:       'badge-info',
  PACKED:           'badge-info',
  SHIPPED:          'badge-primary',
  OUT_FOR_DELIVERY: 'badge-primary',
  DELIVERED:        'badge-success',
  CANCELLED:        'badge-danger',
  RETURNED:         'badge-gray',
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  () => adminApi.get('/api/accounting/dashboard?period=month').then((r) => r.data.data),
    refetchInterval: 60_000, // refresh every minute
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn:  () => adminApi.get('/api/orders?limit=8&sort=createdAt_desc').then((r) => r.data.data),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn:  () => adminApi.get('/api/products?inStock=false&limit=5').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue (Month)"
          value={formatNPR(stats?.totalRevenue || 0)}
          icon={TrendingUp}
          change={stats?.revenueChange}
          changeType="up"
          color="bg-primary-500"
        />
        <StatCard
          title="Total Orders"
          value={String(stats?.totalOrders || 0)}
          icon={ShoppingBag}
          change={stats?.ordersChange}
          changeType="up"
          color="bg-blue-500"
        />
        <StatCard
          title="Net Profit"
          value={formatNPR(stats?.totalProfit || 0)}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Total Customers"
          value={String(stats?.totalCustomers || 0)}
          icon={Users}
          color="bg-purple-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Revenue (Last 30 Days)</h3>
            <span className="text-xs text-gray-500">NPR</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.dailySales || []}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C9184A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#C9184A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Revenue']} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#C9184A"
                strokeWidth={2}
                fill="url(#revenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Products</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.topProducts?.slice(0, 5) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="sold" fill="#C9184A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders & Low stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent orders */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <a href="/orders" className="text-xs text-primary-500 hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders?.orders?.map((order: any) => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{order.user?.name} · {formatDate(order.createdAt)}</p>
                </div>
                <span className={STATUS_STYLES[order.status] || 'badge-gray'}>
                  {order.status}
                </span>
                <p className="text-sm font-semibold text-gray-900 w-24 text-right">
                  {formatNPR(order.total)}
                </p>
              </div>
            ))}
            {!recentOrders?.orders?.length && (
              <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
            )}
          </div>
        </div>

        {/* Low stock alert */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <AlertCircle size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Low Stock Alert</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {lowStock?.products?.slice(0, 6).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {p.images?.[0]?.url && (
                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-red-500">{p.stock} left</p>
                </div>
              </div>
            ))}
            {!lowStock?.products?.length && (
              <p className="text-sm text-gray-400 text-center py-8">All products well stocked</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
