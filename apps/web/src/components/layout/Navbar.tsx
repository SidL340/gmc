'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search, ShoppingBag, Heart, User as UserIcon,
  Menu, X, Sparkles, Facebook, Instagram
} from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cartCount = useCartStore((s) => s.itemCount);
  const { user, isLoggedIn, logout } = useAuthStore();

  const { data: categories = [] } = useQuery<{ id: string; name: string; slug: string }[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data.data),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setMobileMenuOpen(false);
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-sm">
      {/* Top announcement bar */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-rose-700 text-white text-xs py-1.5 px-3 sm:px-4 font-medium overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-rose-100">
            <span>✨ Free Delivery Over Rs. 2000</span>
            <span>•</span>
            <span>COD, FonePay &amp; NepalPay</span>
          </div>
          <div className="w-full sm:w-auto text-center text-xs font-medium truncate">
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 group min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-rose-200 shadow-sm group-hover:scale-105 transition-transform bg-white flex items-center justify-center p-0.5 flex-shrink-0">
              <img src="/logo.jpg" alt="GM Collection House" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-xl font-extrabold tracking-tight text-gray-900 font-serif block truncate">
                GM COLLECTION
              </span>
              <span className="hidden sm:block text-[10px] tracking-widest text-primary-600 uppercase font-semibold truncate">
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
          <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
            {/* Wishlist (Desktop only - mobile has it in sticky bottom nav) */}
            <Link
              href="/wishlist"
              className="hidden md:flex p-2 text-gray-700 hover:text-primary-600 rounded-full hover:bg-rose-50 transition-colors relative"
              title="Wishlist"
            >
              <Heart size={22} />
            </Link>

            {/* Cart (Desktop only - mobile has it in sticky bottom nav with live badge) */}
            <Link
              href="/cart"
              className="hidden md:flex p-2 text-gray-700 hover:text-primary-600 rounded-full hover:bg-rose-50 transition-colors relative"
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 p-1 pr-2 sm:p-1.5 sm:pr-3 rounded-full hover:bg-gray-100 text-xs sm:text-sm font-medium text-gray-700 transition-colors"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline font-semibold">{user?.name?.split(' ')[0]}</span>
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 text-sm z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
                      Signed in as <span className="font-semibold text-gray-800">{user?.name}</span>
                    </div>
                    <Link
                      href="/account/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-rose-50 hover:text-primary-600"
                    >
                      My Orders
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 bg-rose-50 text-primary-700 hover:bg-primary-600 hover:text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all shadow-xs border border-rose-100"
              >
                <UserIcon size={14} />
                <span>Login</span>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-gray-700 hover:text-primary-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Secondary Category Navigation — Dynamically rendered */}
        <nav className="hidden md:flex items-center gap-6 py-2.5 border-t border-gray-100 text-sm font-medium text-gray-600 overflow-x-auto scrollbar-none">
          <Link href="/shop" className="hover:text-primary-600 whitespace-nowrap transition-colors">
            All Clothes
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="hover:text-primary-600 whitespace-nowrap transition-colors"
            >
              {cat.name}
            </Link>
          ))}
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
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-4 shadow-lg">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search Kurtas, Sarees, Dresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </form>

          {/* Dynamic Categories Grid */}
          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-gray-700">
            <Link
              href="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-gray-50 rounded-lg hover:bg-rose-50 hover:text-primary-600 transition-colors"
            >
              All Clothes
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-gray-50 rounded-lg hover:bg-rose-50 hover:text-primary-600 transition-colors truncate"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href="/shop?new=true"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-rose-50 text-primary-600 rounded-lg font-semibold flex items-center gap-1"
            >
              <Sparkles size={14} /> New Arrivals
            </Link>
            <Link
              href="/#tiktok"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-gray-50 rounded-lg flex items-center gap-1"
            >
              <span>🎵</span> TikTok Videos
            </Link>
          </div>

          {/* Mobile Account Section */}
          <div className="pt-3 border-t border-gray-100">
            {isLoggedIn() ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/account/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-gray-700 hover:text-primary-600 flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span>My Orders ({user?.name})</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-red-600 hover:underline px-2 py-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <UserIcon size={16} /> Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
