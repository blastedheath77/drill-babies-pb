'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { OfflineIndicator } from '@/components/offline-indicator';
import { InstallPrompt } from '@/components/install-prompt';
import { UpdateNotification, CompactUpdateNotification } from '@/components/update-notification';
import { useAppUpdate } from '@/hooks/use-app-update';
import { UnifiedNavigation } from '@/components/layout/unified-navigation';
import { useIsMobile } from '@/hooks/use-mobile';


// Pages reachable without signing in. Everything else is members-only.
const PUBLIC_PATHS = ['/login', '/register', '/reset-password'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const { isUpdateAvailable, isUpdating, updateApp, dismissUpdate } = useAppUpdate();
  const isMobile = useIsMobile();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (isInitialized && !user && !isPublic) {
      router.replace('/login');
    }
  }, [isInitialized, user, isPublic, router]);

  // Show public pages without navigation
  if (isPublic) {
    return children;
  }

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop/Tablet Layout */}
      {!isMobile && (
        <div className="flex">
          <UnifiedNavigation />
          <main className="flex-1 p-3 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 p-3 sm:p-6 pb-20">
            {children}
          </main>
          <UnifiedNavigation />
        </div>
      )}

      {/* Global Components */}
      <OfflineIndicator />
      <InstallPrompt />
      
      {/* Update notifications */}
      <UpdateNotification
        isVisible={isUpdateAvailable}
        onUpdate={updateApp}
        onDismiss={dismissUpdate}
        isUpdating={isUpdating}
      />
      <CompactUpdateNotification
        isVisible={isUpdateAvailable}
        onUpdate={updateApp}
        onDismiss={dismissUpdate}
        isUpdating={isUpdating}
      />
    </div>
  );
}
