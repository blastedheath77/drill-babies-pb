'use client';

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { mainNavItems, actionNavItems, specialNavItems, adminNavItems } from '@/config/nav-items';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { LogOut, LogIn } from 'lucide-react';
import { Header } from './header';
import { useAuth } from '@/contexts/auth-context';
import { AuthWrapper } from '@/components/auth-wrapper';
import { OfflineIndicator } from '@/components/offline-indicator';
import { InstallPrompt } from '@/components/install-prompt';
import { BottomNav } from '@/components/layout/bottom-nav';
import { UpdateNotification, CompactUpdateNotification } from '@/components/update-notification';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AppSidebarContent() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { user, isAdmin, logout, isLoading } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Icons.PickleballPaddle className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold">Drill babies</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Main Navigation */}
        <div className="flex-1">
          <SidebarMenu>
            {mainNavItems
              .filter((item) => {
                // Hide bottom nav items on mobile (only in sidebar)
                const bottomNavRoutes = ['/', '/statistics', '/log-game'];
                return !bottomNavRoutes.includes(item.href) || !isMobile;
              })
              .map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} onClick={handleNavClick}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    size="mobile"
                    tooltip={{ children: item.title, side: 'right' }}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <SidebarSeparator className="my-4" />

          {/* Action Items - Tournaments */}
          <div className="px-2 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Events
            </div>
            <SidebarMenu>
              {actionNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} onClick={handleNavClick}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      size="mobile"
                      tooltip={{ children: item.title, side: 'right' }}
                      className="bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-800 data-[state=open]:bg-orange-100 data-[active=true]:bg-orange-200 data-[active=true]:text-orange-900"
                    >
                      <item.icon className="text-orange-600" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </div>

        {/* Admin Section (only for admin users) */}
        {!isLoading && isClient && isAdmin() && (
          <div className="px-2 mb-4">
            <SidebarSeparator className="mb-4" />
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Administration
            </div>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} onClick={handleNavClick}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      size="mobile"
                      tooltip={{ children: item.title, side: 'right' }}
                      className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-800 data-[state=open]:bg-red-100 data-[active=true]:bg-red-200 data-[active=true]:text-red-900"
                    >
                      <item.icon className="text-red-600" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        )}

        {/* Special Action Item - Log Game (at bottom) - Hide on mobile as it's in bottom nav */}
        {!isMobile && (
          <div className="px-2 pb-4">
            <SidebarSeparator className="mb-4" />
            <SidebarMenu>
              {specialNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} onClick={handleNavClick}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      size="mobile"
                      tooltip={{ children: item.title, side: 'right' }}
                      className="bg-primary/10 border-2 border-primary/30 hover:bg-primary/20 text-primary hover:text-primary data-[state=open]:bg-primary/20 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground shadow-sm"
                    >
                      <item.icon className="text-primary data-[active=true]:text-primary-foreground" />
                      <span className="font-semibold">{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        {!isLoading && isClient ? (
          user ? (
            <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.avatar || 'https://placehold.co/100x100.png'}
                    alt={user?.name || 'User'}
                  />
                  <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-semibold">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role === 'admin' ? 'Administrator' : 'Player'}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={logout}
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="p-2">
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => {
                  handleNavClick();
                  router.push('/login');
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          )
        ) : (
          <div className="p-2">
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        )}
      </SidebarFooter>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isUpdateAvailable, isUpdating, updateApp, dismissUpdate } = useAppUpdate();
  
  // Show login page without sidebar
  if (pathname === '/login') {
    return children;
  }

  // Temporarily disable auth checks for testing
  // TODO: Re-enable authentication after fixing webpack issues

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebarContent />
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</main>
        <OfflineIndicator />
        <InstallPrompt />
        <BottomNav />
        
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
      </SidebarInset>
    </SidebarProvider>
  );
}
