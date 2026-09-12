'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  Tag, Image, Settings, Printer, Truck, Bell, LogOut,
  ChevronRight, Store,
} from 'lucide-react';
import { useAdminStore } from '@/store/admin.store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href:  '/dashboard',
    icon:  LayoutDashboard,
  },
  {
    label: 'Products',
    href:  '/products',
    icon:  Package,
  },
  {
    label: 'Orders',
    href:  '/orders',
    icon:  ShoppingCart,
    badge: 'orders',
  },
  {
    label: 'Customers',
    href:  '/customers',
    icon:  Users,
  },
  {
    label: 'POS Billing',
    href:  '/pos',
    icon:  Printer,
  },
  {
    label: 'Delivery (NCM)',
    href:  '/delivery',
    icon:  Truck,
  },
  {
    label: 'Offers & Coupons',
    href:  '/offers',
    icon:  Tag,
  },
  {
    label: 'Banners / CMS',
    href:  '/banners',
    icon:  Image,
  },
  {
    label: 'Accounting',
    href:  '/accounting',
    icon:  BarChart3,
  },
  {
    label: 'Notifications',
    href:  '/notifications',
    icon:  Bell,
  },
  {
    label: 'Store Settings',
    href:  '/settings',
    icon:  Settings,
  },
];

export default function AdminSidebar() {
  const pathname  = usePathname();
  const { user, logout } = useAdminStore();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-white/5 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
          <Store className="text-white" size={18} />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">GM Collection</p>
          <p className="text-gray-500 text-xs">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon     = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'active')}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name || 'Admin'}</p>
            <p className="text-gray-500 text-xs truncate">{user?.phone || ''}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
