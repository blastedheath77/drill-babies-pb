'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  activeRoutes?: string[];
}

const navItems: BottomNavItem[] = [
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

  const isActive = (item: BottomNavItem) => {
    if (item.activeRoutes) {
      return item.activeRoutes.some(route => pathname === route);
    }
    return pathname === item.href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav lg:hidden">
      <div className="flex items-center justify-around h-20 px-4 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <Link
              key={item.href}
              href={item.href}
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