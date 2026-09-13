'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, Heart, ShoppingBag, MessageCircle } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.itemCount);

  // Don't show in checkout or full-screen auth if needed, but show on main shopping pages
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  if (isAuthPage) return null;

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Shop', href: '/shop', icon: Sparkles },
    {
      label: 'Bag',
      href: '/cart',
      icon: ShoppingBag,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    { label: 'Wishlist', href: '/wishlist', icon: Heart },
    {
      label: 'WhatsApp',
      href: 'https://wa.me/9779800000000?text=Hi%20GM%20Collection%20House,%20I%20am%20interested%20in%20your%20collection!',
      icon: MessageCircle,
      external: true,
      color: 'text-emerald-600',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-rose-100 px-3 py-2 shadow-lg shadow-rose-950/10">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = !item.external && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
          const Icon = item.icon;

          if (item.external) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 transition-transform active:scale-95"
              >
                <div className="relative">
                  <Icon size={20} />
                </div>
                <span className="mt-1">{item.label}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className="relative">
                <Icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
