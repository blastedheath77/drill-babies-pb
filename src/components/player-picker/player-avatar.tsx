'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/** Initials-based avatar; ignores the old grey placeholder images. */
export function PlayerAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const usable = src && !src.includes('placehold.co') ? src : undefined;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <Avatar className={cn('h-9 w-9', className)}>
      {usable && <AvatarImage src={usable} alt={name} />}
      <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
    </Avatar>
  );
}
