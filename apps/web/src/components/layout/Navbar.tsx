'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, ShoppingBag, Heart, User as UserIcon,
  Menu, X, Sparkles, Facebook, Instagram
} from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';

function TikTokIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.04-4.52z"/>
    </svg>
  );
}

export default function Navbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartCount = useCartStore((s) => s.itemCount);
  const { user, isLoggedIn, logout } = useAuthStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-sm">
      {/* Top announcement bar */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-rose-700 text-white text-xs py-1.5 px-4 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-rose-100">
            <span>✨ Free Delivery Over Rs. 2000</span>
            <span>•</span>
            <span>COD, FonePay &amp; NepalPay</span>
          </div>
          <div className="mx-auto sm:mx-0 text-center text-xs font-medium">
            GM Collection House · House of Women's Fashion
          </div>
          <div className="hidden md:flex items-center gap-3 text-white/90">
            <a
              href="https://www.facebook.com/gmcollectionhouse/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Facebook"
            >
              <Facebook size={12} />
              <span className="hidden lg:inline">Facebook</span>
            </a>
            <a
              href="https://www.instagram.com/gmcollectionhouse"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Instagram"
            >
              <Instagram size={12} />
              <span className="hidden lg:inline">Instagram</span>
            </a>
            <a
              href="https://www.tiktok.com/@gmcollectionhouse"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full"
              title="TikTok"
            >
              <TikTokIcon className="w-3 h-3" />
              <span>@gmcollectionhouse</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-rose-200 shadow-sm group-hover:scale-105 transition-transform bg-white flex items-center justify-center p-0.5">
              <img src="/logo.jpg" alt="GM Collection House" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900 font-serif">
                GM COLLECTION
              </span>
              <span className="block text-[10px] tracking-widest text-primary-600 uppercase font-semibold">
                House of Women's Fashion
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search Kurtas, Sarees, Dresses, Lehengas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={18} />
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-4">
            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="p-2 text-gray-700 hover:text-primary-600 rounded-full hover:bg-rose-50 transition-colors relative"
              title="Wishlist"
            >
              <Heart size={22} />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="p-2 text-gray-700 hover:text-primary-600 rounded-full hover:bg-rose-50 transition-colors relative"
              title="Shopping Bag"
            >
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User / Login */}
            {isLoggedIn() ? (
              <div className="relative group">
                <Link
                  href="/account/orders"
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden lg:inline">{user?.name}</span>
                </Link>
                <div className="hidden group-hover:block absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 text-sm z-50">
                  <Link href="/account/orders" className="block px-4 py-2 text-gray-700 hover:bg-rose-50 hover:text-primary-600">
                    My Orders
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm"
              >
                <UserIcon size={16} />
                <span>Login</span>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary-600"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Secondary Category Navigation */}
        <nav className="hidden md:flex items-center gap-8 py-2.5 border-t border-gray-100 text-sm font-medium text-gray-600 overflow-x-auto">
          <Link href="/shop" className="hover:text-primary-600 whitespace-nowrap">
            All Clothes
          </Link>
          <Link href="/shop?category=kurta" className="hover:text-primary-600 whitespace-nowrap">
            Kurtas & Suits
          </Link>
          <Link href="/shop?category=saree" className="hover:text-primary-600 whitespace-nowrap">
            Sarees
          </Link>
          <Link href="/shop?category=lehenga" className="hover:text-primary-600 whitespace-nowrap">
            Lehengas
          </Link>
          <Link href="/shop?category=dresses" className="hover:text-primary-600 whitespace-nowrap">
            Western & Dresses
          </Link>
          <Link href="/shop?new=true" className="text-primary-600 font-semibold flex items-center gap-1 whitespace-nowrap">
            <Sparkles size={14} /> New Arrivals
          </Link>
          <Link href="/#tiktok" className="text-gray-900 font-semibold flex items-center gap-1 whitespace-nowrap hover:text-primary-600">
            <span>🎵</span> TikTok Showcase
          </Link>
        </nav>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search clothing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </form>
          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-gray-700 pt-2">
            <Link href="/shop" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-lg">
              All Clothes
            </Link>
            <Link href="/shop?category=kurta" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-lg">
              Kurtas & Suits
            </Link>
            <Link href="/shop?category=saree" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-lg">
              Sarees
            </Link>
            <Link href="/shop?category=dresses" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-lg">
              Dresses
            </Link>
            <Link href="/shop?new=true" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-rose-50 text-primary-600 rounded-lg font-semibold">
              ✨ New Arrivals
            </Link>
            <Link href="/#tiktok" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-lg">
              🎵 TikTok Videos
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
