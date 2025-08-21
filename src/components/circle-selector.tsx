'use client';

import React from 'react';
import { Check, ChevronDown, Users, Globe, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCircles } from '@/contexts/circle-context';
import { useAuth } from '@/contexts/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CircleSelectorProps {
  className?: string;
  variant?: 'default' | 'compact';
  showCreateOption?: boolean;
  onCreateCircle?: () => void;
}

export function CircleSelector({ 
  className, 
  variant = 'default',
  showCreateOption = true,
  onCreateCircle 
}: CircleSelectorProps) {
  const { isAuthenticated } = useAuth();
  const {
    selectedCircleId,
    selectedCircle,
    availableCircles,
    isLoadingCircles,
    setSelectedCircleId,
  } = useCircles();

  // Don't show selector if user is not authenticated
  if (!isAuthenticated()) {
    return null;
  }

  const handleCircleSelect = (circleId: string | 'all') => {
    setSelectedCircleId(circleId);
  };

  const handleCreateCircle = () => {
    if (onCreateCircle) {
      onCreateCircle();
    } else {
      // Default behavior - could navigate to create page
      window.location.href = '/circles/create';
    }
  };

  if (isLoadingCircles && variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (isLoadingCircles) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  const displayText = selectedCircleId === 'all' 
    ? 'All Players' 
    : selectedCircle?.name || 'Unknown Circle';
  
  const displayIcon = selectedCircleId === 'all' ? Globe : Users;
  const Icon = displayIcon;

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-2 flex items-center gap-1 text-sm"
            >
              <Icon className="h-3 w-3" />
              <span className="max-w-24 truncate">{displayText}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Select Circle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* All Players Option */}
            <DropdownMenuItem
              onClick={() => handleCircleSelect('all')}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>All Players</span>
              </div>
              {selectedCircleId === 'all' && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            
            {/* User's Circles */}
            {availableCircles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {availableCircles.map((circle) => (
                  <DropdownMenuItem
                    key={circle.id}
                    onClick={() => handleCircleSelect(circle.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="truncate">{circle.name}</span>
                    </div>
                    {selectedCircleId === circle.id && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            
            {/* Create Circle Option */}
            {showCreateOption && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleCreateCircle}
                  className="flex items-center gap-2 text-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Circle</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 min-w-48"
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left truncate">{displayText}</span>
            {selectedCircleId !== 'all' && selectedCircle && (
              <Badge variant="secondary" className="text-xs">
                {selectedCircle.memberCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select Circle
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* All Players Option */}
          <DropdownMenuItem
            onClick={() => handleCircleSelect('all')}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4" />
              <div>
                <div className="font-medium">All Players</div>
                <div className="text-xs text-muted-foreground">
                  View all players and games
                </div>
              </div>
            </div>
            {selectedCircleId === 'all' && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          
          {/* User's Circles */}
          {availableCircles.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                Your Circles
              </DropdownMenuLabel>
              {availableCircles.map((circle) => (
                <DropdownMenuItem
                  key={circle.id}
                  onClick={() => handleCircleSelect(circle.id)}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{circle.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {circle.description || `${circle.memberCount} members`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {circle.memberCount}
                    </Badge>
                    {selectedCircleId === circle.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {/* No Circles Message */}
          {availableCircles.length === 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                You haven't joined any circles yet
              </div>
            </>
          )}
          
          {/* Create Circle Option */}
          {showCreateOption && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCreateCircle}
                className="flex items-center gap-3 py-3 text-primary focus:text-primary"
              >
                <Plus className="h-4 w-4" />
                <div>
                  <div className="font-medium">Create New Circle</div>
                  <div className="text-xs text-muted-foreground">
                    Start your own player group
                  </div>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Simplified version for use in tight spaces
export function CircleSelectorCompact(props: Omit<CircleSelectorProps, 'variant'>) {
  return <CircleSelector {...props} variant="compact" />;
}

// Hook for getting current circle display info
export function useCircleDisplay() {
  const { selectedCircleId, selectedCircle } = useCircles();
  
  return {
    displayText: selectedCircleId === 'all' 
      ? 'All Players' 
      : selectedCircle?.name || 'Unknown Circle',
    displayIcon: selectedCircleId === 'all' ? Globe : Users,
    isAllPlayers: selectedCircleId === 'all',
    memberCount: selectedCircle?.memberCount || 0,
  };
}