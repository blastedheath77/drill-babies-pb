'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  playerOnly?: boolean;
  adminOnly?: boolean;
  viewerAllowed?: boolean;
}

export function AuthWrapper({ 
  children, 
  requireAuth = false, 
  playerOnly = false,
  adminOnly = false,
  viewerAllowed = true 
}: AuthWrapperProps) {
  const { user, isLoading, isInitialized, isAdmin, isPlayer } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect until auth is initialized
    if (!isInitialized || isLoading) {
      return;
    }

    // Skip auth checks for login and register pages
    if (pathname === '/login' || pathname === '/register') {
      return;
    }

    // If auth is required but user is not logged in
    if (requireAuth && !user) {
      router.push('/login');
      return;
    }

    // If admin access is required but user is not admin
    if (adminOnly && (!user || !isAdmin())) {
      router.push('/');
      return;
    }

    // If player access is required but user is not a player or admin
    if (playerOnly && (!user || !isPlayer())) {
      router.push('/login');
      return;
    }

    // If viewers are not allowed and user is not authenticated
    if (!viewerAllowed && !user) {
      router.push('/login');
      return;
    }
  }, [user, isLoading, isInitialized, isAdmin, isPlayer, router, pathname, requireAuth, playerOnly, adminOnly, viewerAllowed]);

  // Show loading state while checking authentication
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Permission checks for rendering
  
  // Admin-only content
  if (adminOnly && (!user || !isAdmin())) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-sm">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  // Player-only content
  if (playerOnly && (!user || !isPlayer())) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-sm">You need to sign in to access this feature.</p>
          </div>
        </div>
      </div>
    );
  }

  // Auth required content
  if (requireAuth && !user) {
    return null; // Redirect will happen in useEffect
  }

  // Viewer not allowed
  if (!viewerAllowed && !user) {
    return null; // Redirect will happen in useEffect
  }

  return <>{children}</>;
}