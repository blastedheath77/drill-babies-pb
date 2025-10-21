'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getVisibleNavItems,
  getBottomNavItems,
  getNavItemsByCategory,
  type NavItem,
} from '@/config/nav-items';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';

interface UnifiedNavigationProps {
  className?: string;
}

// Desktop/Tablet Sidebar Component
function DesktopSidebar({
  isCollapsed = false,
  onToggleCollapsed,
}: {
  isCollapsed?: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const { user, isAdmin, logout, isLoading } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const mainItems = getNavItemsByCategory('main', user?.role);
  const actionItems = getNavItemsByCategory('action', user?.role);
  const specialItems = getNavItemsByCategory('special', user?.role);
  const adminItems = getNavItemsByCategory('admin', user?.role);

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <TooltipProvider key={item.href}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                size={isCollapsed ? 'icon' : 'default'}
                className={cn(
                  'w-full justify-start gap-2',
                  isCollapsed && 'px-2',
                  item.category === 'action' &&
                    'bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-800',
                  item.category === 'special' &&
                    'bg-primary/10 border-2 border-primary/30 hover:bg-primary/20 text-primary',
                  item.category === 'admin' &&
                    'bg-red-50 border border-red-200 hover:bg-red-100 text-red-800'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.title}</span>}
              </Button>
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <p>{item.title}</p>
              {item.description && <p className="text-xs opacity-70">{item.description}</p>}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-r transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Collapse Toggle Button */}
      <div className="flex justify-end p-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          className="h-8 w-8 shrink-0"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Main Items */}
        <div className="space-y-1">{mainItems.map(renderNavItem)}</div>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <>
            {!isCollapsed && <Separator />}
            <div>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Events
                </h3>
              )}
              <div className="space-y-1">{actionItems.map(renderNavItem)}</div>
            </div>
          </>
        )}

        {/* Admin Items */}
        {adminItems.length > 0 && (
          <>
            {!isCollapsed && <Separator />}
            <div>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Administration
                </h3>
              )}
              <div className="space-y-1">{adminItems.map(renderNavItem)}</div>
            </div>
          </>
        )}

        {/* Special Items */}
        {specialItems.length > 0 && (
          <>
            {!isCollapsed && <Separator />}
            <div className="space-y-1">{specialItems.map(renderNavItem)}</div>
          </>
        )}
      </div>

      {/* Authentication Section */}
      <div className="border-t p-2 flex-shrink-0">
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Account
          </div>
        )}

        {/* Theme Toggle */}
        <div className="mb-2">
          <ThemeToggle iconOnly={isCollapsed} />
        </div>

        {!isLoading && isClient ? (
          user ? (
            <div className="space-y-2">
              {/* User Info - Collapsed shows avatar only */}
              {isCollapsed ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex justify-center">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user?.avatar || 'https://placehold.co/100x100.png'}
                            alt={user?.name || 'User'}
                          />
                          <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{user?.name || 'User'}</p>
                      <p className="text-xs opacity-70">
                        {user?.role === 'admin' ? 'Administrator' : 'Player'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.avatar || 'https://placehold.co/100x100.png'}
                      alt={user?.name || 'User'}
                    />
                    <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.role === 'admin' ? 'Administrator' : 'Player'}
                    </p>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size={isCollapsed ? 'icon' : 'default'}
                      className="w-full"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-2">Sign Out</span>}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      <p>Sign Out</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size={isCollapsed ? 'icon' : 'default'}
                      className="w-full"
                      onClick={() => router.push('/login')}
                    >
                      <LogIn className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-2">Sign In</span>}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      <p>Sign In</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {!isCollapsed && (
                <>
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => router.push('/register')}
                  >
                    Create Account
                  </Button>
                  <div className="text-center text-xs text-muted-foreground">
                    Or browse as viewer
                  </div>
                </>
              )}
            </div>
          )
        ) : (
          <div className="space-y-2">
            <div className="h-10 bg-muted animate-pulse rounded" />
            {!isCollapsed && <div className="h-8 bg-muted animate-pulse rounded opacity-60" />}
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile Bottom Navigation Component
function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isAdmin, isLoading } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const bottomNavItems = getBottomNavItems(user?.role);

  const isActive = (item: NavItem) => {
    return pathname === item.href;
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav lg:hidden">
        <div className="flex items-center justify-around h-20 px-4 safe-area-inset-bottom">
          {/* Menu Button */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  'bottom-nav-item rounded-lg transition-all duration-200',
                  'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Menu className="h-5 w-5 mb-1 text-muted-foreground" />
                <span className="text-xs font-medium leading-none text-muted-foreground">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[270px]">
              <MobileSidebarMenu onClose={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>

          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'bottom-nav-item rounded-lg transition-all duration-200',
                  active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Icon
                  className={cn('h-5 w-5 mb-1', active ? 'text-primary' : 'text-muted-foreground')}
                />
                <span
                  className={cn(
                    'text-xs font-medium leading-none',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* Show skeleton for Log Game if auth is loading and it's not yet visible */}
          {isLoading && bottomNavItems.length < 3 && (
            <div className="bottom-nav-item rounded-lg opacity-50">
              <div className="h-5 w-5 mb-1 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-3 w-12 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          )}
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-20 lg:hidden" />
    </>
  );
}

// Mobile Sidebar Menu Component
function MobileSidebarMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { user, isAdmin, logout, isLoading } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const visibleItems = getVisibleNavItems(user?.role, true);

  // Filter out items that are already in the bottom navigation
  const bottomNavPaths = getBottomNavItems(user?.role).map((item) => item.href);
  const allMenuItems = visibleItems.filter((item) => !bottomNavPaths.includes(item.href));

  // Separate admin items from regular menu items
  const regularMenuItems = allMenuItems.filter((item) => item.category !== 'admin');
  const adminMenuItems = allMenuItems.filter((item) => item.category === 'admin');

  return (
    <div className="flex flex-col h-full">
      {/* Header with Theme Toggle */}
      <div className="flex items-center justify-start px-3 py-4 border-b">
        <ThemeToggle iconOnly />
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-1">
          {regularMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-1 py-2 text-base font-bold transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.title}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Admin Items - fixed at bottom before Account section */}
      {adminMenuItems.length > 0 && (
        <div className="border-t px-3 py-3 flex-shrink-0">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-1 py-2 text-base font-bold transition-colors',
                  isActive
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                )}
              >
                <Icon className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.title}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Authentication Section */}
      <div className="border-t pt-4 px-3 flex-shrink-0">
        <div className="mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Account
          </div>

          {!isLoading && isClient ? (
            user ? (
              <div className="space-y-2">
                {/* User Info Card */}
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.avatar || 'https://placehold.co/100x100.png'}
                      alt={user?.name || 'User'}
                    />
                    <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.role === 'admin' ? 'Administrator' : 'Player'}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    onClose();
                    router.push('/login');
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    onClose();
                    router.push('/register');
                  }}
                >
                  Create Account
                </Button>
                <div className="text-center text-xs text-muted-foreground pt-1">
                  Or browse as viewer
                </div>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-8 bg-muted animate-pulse rounded opacity-60" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Unified Navigation Component
export function UnifiedNavigation({ className }: UnifiedNavigationProps) {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleCollapsed = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (isMobile) {
    return <MobileBottomNav />;
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      <div className="fixed left-0 top-0 h-full z-30">
        <DesktopSidebar isCollapsed={sidebarCollapsed} onToggleCollapsed={handleToggleCollapsed} />
      </div>
    </div>
  );
}

// Hook for external components to check navigation state
export function useUnifiedNavigation() {
  const isMobile = useIsMobile();
  const { user, isAdmin } = useAuth();

  return {
    isMobile,
    visibleItems: getVisibleNavItems(user?.role, isMobile),
    bottomNavItems: getBottomNavItems(user?.role),
  };
}
