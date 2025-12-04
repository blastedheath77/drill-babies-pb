'use client';

import { useCircles } from '@/hooks/use-circles';
import { useClub } from '@/contexts/club-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users2, Circle as CircleIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircleSelectorProps {
  selectedCircleId: string | null;
  onCircleChange: (circleId: string | null) => void;
  placeholder?: string;
  showPlayerCount?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

const ALL_PLAYERS_VALUE = 'all-players';

export function CircleSelector({
  selectedCircleId,
  onCircleChange,
  placeholder = 'Select circle...',
  showPlayerCount = true,
  className,
  size = 'default',
}: CircleSelectorProps) {
  const { selectedClub } = useClub();
  const { data: circles, isLoading, error, isError } = useCircles(selectedClub?.id);

  const handleValueChange = (value: string) => {
    if (value === ALL_PLAYERS_VALUE) {
      onCircleChange(null);
    } else {
      onCircleChange(value);
    }
  };

  const getCurrentValue = () => {
    return selectedCircleId || ALL_PLAYERS_VALUE;
  };

  const getDisplayValue = () => {
    if (!selectedCircleId) {
      return 'All Players';
    }

    const selectedCircle = circles?.find(c => c.id === selectedCircleId);
    if (!selectedCircle) {
      return 'All Players';
    }

    if (showPlayerCount) {
      const playerCount = selectedCircle.playerIds.length;
      return `${selectedCircle.name} (${playerCount})`;
    }

    return selectedCircle.name;
  };

  const sizeClasses = {
    sm: 'h-8 text-xs',
    default: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  if (isError) {
    return (
      <Alert variant="destructive" className={cn('w-full max-w-xs', className)}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Failed to load circles
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Skeleton
        className={cn(
          'w-full max-w-xs',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  // If no circles exist, show a simple indicator
  if (!circles || circles.length === 0) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border rounded-md bg-muted/30 w-full max-w-xs',
        sizeClasses[size],
        className
      )}>
        <Users2 className="h-4 w-4" />
        <span>All Players</span>
        <Badge variant="outline" className="ml-auto text-xs">
          No circles
        </Badge>
      </div>
    );
  }

  return (
    <Select
      value={getCurrentValue()}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className={cn(
        'w-full max-w-xs',
        sizeClasses[size],
        className
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {selectedCircleId ? (
            <CircleIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <Users2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <SelectValue placeholder={placeholder}>
            <span className="truncate">{getDisplayValue()}</span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {/* All Players Option */}
        <SelectItem value={ALL_PLAYERS_VALUE}>
          <div className="flex items-center gap-2 w-full">
            <Users2 className="h-4 w-4 text-primary" />
            <span className="font-medium">All Players</span>
            {showPlayerCount && (
              <Badge variant="default" className="ml-auto text-xs">
                Default
              </Badge>
            )}
          </div>
        </SelectItem>

        {/* Circle Options */}
        {circles.map((circle) => {
          const playerCount = circle.playerIds.length;

          return (
            <SelectItem key={circle.id} value={circle.id}>
              <div className="flex items-center gap-2 w-full">
                <CircleIcon className={`h-4 w-4 ${playerCount > 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="truncate flex-1">{circle.name}</span>
                {showPlayerCount && (
                  <Badge
                    variant={playerCount > 0 ? "secondary" : "outline"}
                    className="ml-auto text-xs"
                  >
                    {playerCount} player{playerCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {playerCount === 0 && (
                  <span className="text-xs text-muted-foreground ml-1">(Empty)</span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// Compact version for use in headers or constrained spaces
export function CircleSelectorCompact({
  selectedCircleId,
  onCircleChange,
  className,
}: Omit<CircleSelectorProps, 'size' | 'showPlayerCount' | 'placeholder'>) {
  return (
    <CircleSelector
      selectedCircleId={selectedCircleId}
      onCircleChange={onCircleChange}
      placeholder="Filter..."
      showPlayerCount={false}
      size="sm"
      className={cn('max-w-[140px]', className)}
    />
  );
}