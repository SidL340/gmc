import Link from 'next/link';
import { Phone, Mail, MapPin, Truck, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-8 border-t border-gray-800">
      {/* Value props */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-white">All Nepal Delivery</h4>
              <p className="text-xs text-gray-400 mt-0.5">Prompt logistics by NepalCanMove</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-white">COD, FonePay & NepalPay</h4>
              <p className="text-xs text-gray-400 mt-0.5">Pay via QR, digital wallet or on delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400">
              <RefreshCw size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-white">Premium Quality</h4>
              <p className="text-xs text-gray-400 mt-0.5">Curated fabrics & authentic traditional wear</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-rose-300 p-0.5 shadow-md flex-shrink-0">
                <img src="/logo.jpg" alt="GM Collection House" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-white leading-tight">GM COLLECTION</h3>
                <span className="text-[9px] tracking-widest text-rose-300 uppercase font-semibold">House of Women's Fashion</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Nepal's premier clothing store specializing in exquisite ladies' fashion — Kurta sets, Sarees, Lehengas, and contemporary Western wear.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/shop?category=kurta" className="hover:text-primary-400">Kurta & Suits</Link></li>
              <li><Link href="/shop?category=saree" className="hover:text-primary-400">Sarees</Link></li>
              <li><Link href="/shop?category=lehenga" className="hover:text-primary-400">Lehengas</Link></li>
              <li><Link href="/shop?category=dresses" className="hover:text-primary-400">Western & Party Dresses</Link></li>
              <li><Link href="/#tiktok" className="hover:text-primary-400">TikTok Video Showcase 🎵</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">Customer Care</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/account/orders" className="hover:text-primary-400">Track Order</Link></li>
              <li><Link href="/cart" className="hover:text-primary-400">Shopping Bag</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary-400">My Wishlist</Link></li>
              <li><Link href="/login" className="hover:text-primary-400">Login / Account</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">Store Location</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-primary-400 flex-shrink-0 mt-0.5" />
                <span>Kathmandu, Nepal</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-primary-400 flex-shrink-0" />
                <span>+977-9800000000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-primary-400 flex-shrink-0" />
                <span>info@gmcollection.com.np</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} GM Collection House. All rights reserved.</p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <span>Payment by FonePay, NepalPay & COD</span>
            <span>·</span>
            <span>Delivery by NepalCanMove</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
