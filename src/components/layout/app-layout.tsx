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

// Simplified Header Component for Mobile
function SimpleHeader() {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:hidden">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">Pickleball Stats</span>
      </div>
      <div className="flex-1">{/* Can add page title or breadcrumbs here */}</div>
    </header>
  );
}

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
          <SimpleHeader />
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
