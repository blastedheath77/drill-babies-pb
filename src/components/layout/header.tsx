'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '../ui/button';
import { Icons } from '../icons';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:h-16">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-lg font-semibold">Pickleball Stats</span>
      </div>
      <div className="flex-1">{/* Can add page title or breadcrumbs here */}</div>
    </header>
  );
}
