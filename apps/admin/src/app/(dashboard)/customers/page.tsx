'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Phone, Mail, ShieldAlert, CheckCircle, Ban } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatDate, formatNPR } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: () => adminApi.get(`/api/admin/users?page=${page}&limit=25${search ? `&search=${search}` : ''}`).then((r) => r.data.data),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) =>
      adminApi.patch(`/api/admin/users/${userId}`, { isBlocked }),
    onSuccess: () => {
      toast.success('Customer status updated');
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Users className="text-primary-600" size={28} />
            Customer Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View registered customers, purchase histories, and manage customer account statuses.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10 text-xs py-2 w-full"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Orders</th>
                <th className="text-left px-4 py-3">Total Spent</th>
                <th className="text-left px-4 py-3">Joined Date</th>
                <th className="text-right px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading customer records…</td></tr>
              )}
              {data?.users?.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {customer.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{customer.name || 'Unnamed Customer'}</p>
                        <p className="text-xs text-gray-400">ID: {customer.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p className="flex items-center gap-1 font-mono">📞 {customer.phone}</p>
                    {customer.email && <p className="text-gray-400 mt-0.5">{customer.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      customer.role === 'SUPER_ADMIN' || customer.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : customer.role === 'CASHIER'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {customer.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                    {customer._count?.orders || customer.orders?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-900">
                    {formatNPR(customer.orders?.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0) || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleStatus.mutate({ userId: customer.id, isBlocked: !customer.isBlocked })}
                      disabled={customer.role === 'SUPER_ADMIN'}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        customer.isBlocked
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {customer.isBlocked ? 'Blocked' : 'Active'}
                    </button>
                  </td>
                </tr>
              ))}
              {data?.users?.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No customers found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
