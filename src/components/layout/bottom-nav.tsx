'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Plus, Menu, Users, UserCheck, Swords, Shield, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface BottomNavItem {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  activeRoutes?: string[];
  isMenu?: boolean;
}

const navItems: BottomNavItem[] = [
  {
    icon: Menu,
    label: 'Menu',
    isMenu: true,
  },
  {
    href: '/',
    icon: Home,
    label: 'Home',
    activeRoutes: ['/'],
  },
  {
    href: '/statistics',
    icon: Trophy,
    label: 'Rankings',
    activeRoutes: ['/statistics'],
  },
  {
    href: '/log-game',
    icon: Plus,
    label: 'Log Game',
    activeRoutes: ['/log-game'],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: BottomNavItem) => {
    if (item.activeRoutes) {
      return item.activeRoutes.some(route => pathname === route);
    }
    return pathname === item.href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav lg:hidden">
      <div className="flex items-center justify-around h-20 px-4 safe-area-inset-bottom">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = !item.isMenu && isActive(item);
          
          if (item.isMenu) {
            return (
              <Sheet key={index} open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "bottom-nav-item rounded-lg transition-all duration-200",
                      "mobile-touch-target mobile-tap-highlight",
                      "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-5 w-5 mb-1 text-muted-foreground" />
                    <span className="text-xs font-medium leading-none text-muted-foreground">
                      {item.label}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <MobileSidebar onClose={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "bottom-nav-item rounded-lg transition-all duration-200",
                "mobile-touch-target mobile-tap-highlight",
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 mb-1",
                  active ? "text-primary" : "text-muted-foreground"
                )} 
              />
              <span 
                className={cn(
                  "text-xs font-medium leading-none",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Mobile Sidebar Component
function MobileSidebar({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  
  const allNavItems = [
    { title: 'Home', href: '/', icon: Home },
    { title: 'Players', href: '/players', icon: Users },
    { title: 'Partnerships', href: '/partnerships', icon: UserCheck },
    { title: 'Head-to-Head', href: '/head-to-head', icon: Swords },
    { title: 'Rankings', href: '/statistics', icon: Trophy },
    { title: 'Tournaments', href: '/tournaments', icon: Trophy },
    { title: 'Log Game', href: '/log-game', icon: Plus },
    { title: 'Admin Dashboard', href: '/admin/dashboard', icon: Shield },
    { title: 'Test', href: '/test', icon: TestTube },
  ];

  return (
    <div className="flex flex-col h-full py-6">
      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold">Menu</h2>
      </div>
      
      <div className="flex-1 px-3">
        <nav className="space-y-1">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}