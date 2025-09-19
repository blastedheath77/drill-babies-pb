'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { OfflineIndicator } from '@/components/offline-indicator';
import { InstallPrompt } from '@/components/install-prompt';
import { UpdateNotification, CompactUpdateNotification } from '@/components/update-notification';
import { useAppUpdate } from '@/hooks/use-app-update';
import { UnifiedNavigation } from '@/components/layout/unified-navigation';
import { useIsMobile } from '@/hooks/use-mobile';


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isUpdateAvailable, isUpdating, updateApp, dismissUpdate } = useAppUpdate();
  const isMobile = useIsMobile();
  
  // Show login and register pages without navigation
  if (pathname === '/login' || pathname === '/register') {
    return children;
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
