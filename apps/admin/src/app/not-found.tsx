'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
      <div className="max-w-md bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold font-serif">
          404
        </div>
        <h2 className="text-xl font-bold text-gray-900">Page Not Found</h2>
        <p className="text-xs text-gray-500">
          The admin screen or resource you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
