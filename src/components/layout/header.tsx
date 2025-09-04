'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '../ui/button';
import { Icons } from '../icons';
import { CircleSelectorCompact } from '../circle-selector';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:h-16">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-lg font-semibold">Pickleball Stats</span>
      </div>
      <div className="flex-1 flex items-center gap-4">
        <div className="hidden md:block">
          <span className="text-lg font-semibold">Pickleball Stats</span>
        </div>
        <CircleSelectorCompact />
      </div>
      <div className="flex items-center gap-2">
        {/* Future: Add user menu, notifications, etc. */}
      </div>
    </header>
  );
}
