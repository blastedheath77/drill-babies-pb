'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

export function AuthWrapper({ children, requireAuth = true, adminOnly = false }: AuthWrapperProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      // Skip auth checks for login page
      if (pathname === '/login') {
        return;
      }

      // If auth is required but user is not logged in
      if (requireAuth && !user) {
        router.push('/login');
        return;
      }

      // If admin access is required but user is not admin
      if (adminOnly && user && !isAdmin()) {
        router.push('/');
        return;
      }
    }
  }, [user, isLoading, isAdmin, router, pathname, requireAuth, adminOnly]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if user needs to be redirected
  if (requireAuth && !user) {
    return null;
  }

  if (adminOnly && user && !isAdmin()) {
    return null;
  }

  return <>{children}</>;
}