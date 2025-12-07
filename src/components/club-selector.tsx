'use client';

import React from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClub } from '@/contexts/club-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClubSelectorProps {
  /** Show only the icon when true (for collapsed sidebar) */
  iconOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ClubSelector({ iconOnly = false, className }: ClubSelectorProps) {
  const { selectedClub, availableClubs, isLoading, selectClub } = useClub();

  const handleSelectClub = async (clubId: string) => {
    await selectClub(clubId);
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 p-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {!iconOnly && <span className="text-sm text-muted-foreground">Loading clubs...</span>}
      </div>
    );
  }

  // Don't show selector if user has no clubs
  if (!availableClubs || availableClubs.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 p-2', className)}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        {!iconOnly && <span className="text-sm text-muted-foreground">No clubs available</span>}
      </div>
    );
  }

  // Show static display if user has only one club
  if (availableClubs.length === 1) {
    if (iconOnly) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('flex items-center justify-center p-2 bg-muted/50 rounded-lg', className)}>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{selectedClub?.name || 'Club'}</p>
              {selectedClub?.description && (
                <p className="text-xs opacity-70">{selectedClub.description}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className={cn('flex items-center gap-2 p-2 bg-muted/50 rounded-lg', className)}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{selectedClub?.name || 'Club'}</p>
        </div>
      </div>
    );
  }

  // Show selector if user has multiple clubs
  if (iconOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Select value={selectedClub?.id} onValueChange={handleSelectClub}>
              <SelectTrigger className={cn('w-10 h-10 p-0', className)}>
                <Building2 className="h-4 w-4 shrink-0" />
              </SelectTrigger>
              <SelectContent>
                {availableClubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{selectedClub?.name || 'Select club'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Select value={selectedClub?.id} onValueChange={handleSelectClub}>
      <SelectTrigger className={cn('w-full', className)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Select club..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableClubs.map((club) => (
          <SelectItem key={club.id} value={club.id}>
            {club.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
