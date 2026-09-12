'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, ShoppingBag, Package, Receipt,
  Download, PlusCircle, Trash2, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatNPR, formatDate } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salary', 'Marketing',
  'Packaging', 'Transport', 'Maintenance', 'Other',
];

const PIE_COLORS = ['#C9184A', '#FF4D6D', '#FFB3C1', '#FF85A1', '#A4133C'];

function SummaryCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AccountingPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [showExpForm, setShowExpForm] = useState(false);
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['accounting', period],
    queryFn:  () => adminApi.get(`/api/accounting/dashboard?period=${period}`).then((r) => r.data.data),
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn:  () => adminApi.get('/api/accounting/expenses?limit=50').then((r) => r.data.data),
  });

  const { register, handleSubmit, reset } = useForm<{
    category: string; description: string; amount: string; date: string;
  }>();

  const addExpense = useMutation({
    mutationFn: (d: any) => adminApi.post('/api/accounting/expenses', {
      ...d, amount: parseFloat(d.amount),
    }),
    onSuccess: () => {
      toast.success('Expense recorded!');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      reset(); setShowExpForm(false);
    },
    onError: () => toast.error('Failed to save expense.'),
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/api/accounting/expenses/${id}`),
    onSuccess: () => {
      toast.success('Expense deleted.');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const totalExpenses = expenses?.reduce((s: number, e: any) => s + Number(e.amount), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              period === p ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard title="Revenue" value={formatNPR(stats?.totalRevenue || 0)}
          icon={TrendingUp} color="bg-primary-500" />
        <SummaryCard title="Orders" value={stats?.totalOrders || 0}
          sub={`Avg ${formatNPR(stats?.avgOrderValue || 0)}/order`}
          icon={ShoppingBag} color="bg-blue-500" />
        <SummaryCard title="Gross Profit" value={formatNPR(stats?.totalProfit || 0)}
          icon={Receipt} color="bg-green-500" />
        <SummaryCard title="Expenses" value={formatNPR(totalExpenses)}
          icon={Package} color="bg-amber-500" />
      </div>

      {/* Net profit callout */}
      <div className="card p-5 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <p className="text-sm opacity-80">Net Profit ({period})</p>
        <p className="text-4xl font-bold mt-1">
          {formatNPR((stats?.totalProfit || 0) - totalExpenses)}
        </p>
        <p className="text-xs opacity-70 mt-1">
          Revenue {formatNPR(stats?.totalRevenue || 0)} − Expenses {formatNPR(totalExpenses)}
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.dailySales || []}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C9184A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C9184A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#C9184A" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category sales pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stats?.salesByCategory || []}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                dataKey="revenue" nameKey="name"
              >
                {(stats?.salesByCategory || []).map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expenses */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Expenses</h3>
          <button onClick={() => setShowExpForm(!showExpForm)} className="btn-primary text-sm py-1.5">
            <PlusCircle size={14} /> Add Expense
          </button>
        </div>

        {/* Add expense form */}
        {showExpForm && (
          <form
            onSubmit={handleSubmit((d) => addExpense.mutate(d))}
            className="p-4 border-b border-gray-100 bg-gray-50 grid grid-cols-2 gap-3"
          >
            <div>
              <label className="label text-xs">Category</label>
              <select {...register('category', { required: true })} className="input text-sm">
                <option value="">Select…</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Amount (NPR)</label>
              <input {...register('amount', { required: true })} type="number" className="input text-sm" placeholder="5000" />
            </div>
            <div>
              <label className="label text-xs">Date</label>
              <input {...register('date', { required: true })} type="date" className="input text-sm"
                defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label text-xs">Description</label>
              <input {...register('description', { required: true })} className="input text-sm" placeholder="Monthly rent" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={addExpense.isPending} className="btn-primary text-sm py-1.5">
                Save Expense
              </button>
              <button type="button" onClick={() => setShowExpForm(false)} className="btn-secondary text-sm py-1.5">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Expense list */}
        <div className="divide-y divide-gray-50">
          {expenses?.slice(0, 20).map((exp: any) => (
            <div key={exp.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Package size={15} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{exp.description}</p>
                <p className="text-xs text-gray-500">{exp.category} · {formatDate(exp.date)}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatNPR(exp.amount)}</p>
              <button
                onClick={() => deleteExpense.mutate(exp.id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!expenses?.length && (
            <p className="text-sm text-gray-400 text-center py-8">No expenses recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
