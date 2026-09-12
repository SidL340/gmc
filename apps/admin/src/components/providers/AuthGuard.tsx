'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminStore } from '@/store/admin.store';

const PUBLIC_ROUTES = ['/login'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isLoggedIn } = useAdminStore();

  useEffect(() => {
    const onPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
    if (!isLoggedIn() && !onPublic) {
      router.replace('/login');
    } else if (isLoggedIn() && onPublic) {
      router.replace('/dashboard');
    }
  }, [pathname, isLoggedIn, router]);

  return <>{children}</>;
}
