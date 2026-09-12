'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, ShoppingBag, Heart, User as UserIcon,
  Menu, X, Sparkles
} from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';

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
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-rose-600 text-white text-xs py-1.5 px-4 text-center font-medium">
        ✨ Free Delivery All Over Nepal On Orders Over Rs. 2000 | COD, FonePay & NepalPay Available
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-rose-200">
              GM
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
