'use client';

import { Bell, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/products':           'Products',
  '/products/new':       'Add New Product',
  '/products/categories':'Categories',
  '/orders':             'Orders',
  '/customers':          'Customers',
  '/pos':                'POS Billing',
  '/delivery':           'Delivery Tracking',
  '/offers':             'Offers & Coupons',
  '/banners':            'Banners & CMS',
  '/accounting':         'Accounting Dashboard',
  '/accounting/sales':   'Sales Report',
  '/accounting/expenses':'Expenses',
  '/accounting/profit':  'Profit Report',
  '/settings':           'Store Settings',
  '/notifications':      'Notifications',
};

export default function Header() {
  const pathname = usePathname();
  const title    = PAGE_TITLES[pathname] || 'Admin Panel';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          type="search"
          placeholder="Search..."
          className="input pl-9 py-1.5 text-sm"
        />
      </div>

      {/* Notifications */}
      <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
      </button>
    </header>
  );
}
