'use client';

import { useState, useMemo } from 'react';
import { usePlayers } from '@/hooks/use-players';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Check, X, AlertTriangle } from 'lucide-react';
import type { Player } from '@/lib/types';

interface CirclePlayerSelectorProps {
  selectedPlayerIds: string[];
  onSelectionChange: (playerIds: string[]) => void;
  className?: string;
}

export function CirclePlayerSelector({
  selectedPlayerIds,
  onSelectionChange,
  className,
}: CirclePlayerSelectorProps) {
  const { data: players, isLoading, error, isError } = usePlayers();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    if (!players || !Array.isArray(players)) return [];

    if (!searchQuery.trim()) return players;

    const query = searchQuery.toLowerCase().trim();
    return players.filter(player =>
      player.name.toLowerCase().includes(query) ||
      player.rating.toString().includes(query)
    );
  }, [players, searchQuery]);

  const handlePlayerToggle = (playerId: string) => {
    const newSelection = selectedPlayerIds.includes(playerId)
      ? selectedPlayerIds.filter(id => id !== playerId)
      : [...selectedPlayerIds, playerId];

    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (!filteredPlayers) return;

    const allFilteredIds = filteredPlayers.map(p => p.id);
    const allSelected = allFilteredIds.every(id => selectedPlayerIds.includes(id));

    if (allSelected) {
      // Deselect all filtered players
      const newSelection = selectedPlayerIds.filter(id => !allFilteredIds.includes(id));
      onSelectionChange(newSelection);
    } else {
      // Select all filtered players
      const newSelection = [...new Set([...selectedPlayerIds, ...allFilteredIds])];
      onSelectionChange(newSelection);
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load players. {error?.message || 'Please try refreshing the page.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !players) {
    return (
      <div className={className}>
        <div className="space-y-4">
          {/* Search skeleton */}
          <Skeleton className="h-10 w-full" />

          {/* Controls skeleton */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>

          {/* Players skeleton */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allFilteredSelected = filteredPlayers.length > 0 &&
    filteredPlayers.every(player => selectedPlayerIds.includes(player.id));
  const someFilteredSelected = filteredPlayers.some(player => selectedPlayerIds.includes(player.id));

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players by name or rating..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selection controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedPlayerIds.length} selected
            </Badge>
            {filteredPlayers.length !== players.length && (
              <Badge variant="outline">
                {filteredPlayers.length} filtered
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredPlayers.length === 0}
              className="h-8"
            >
              <Check className="h-4 w-4 mr-1" />
              {allFilteredSelected ? 'Deselect' : 'Select'} All
            </Button>
            {selectedPlayerIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Players list */}
        <div
          className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2"
          role="listbox"
          aria-label="Player selection"
        >
          {filteredPlayers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchQuery ? 'No players found matching your search.' : 'No players available.'}
            </div>
          ) : (
            filteredPlayers.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors"
                role="option"
                aria-selected={selectedPlayerIds.includes(player.id)}
                aria-label={`${player.name}, rating ${player.rating.toFixed(2)}, ${player.wins} wins ${player.losses} losses`}
              >
                <Checkbox
                  checked={selectedPlayerIds.includes(player.id)}
                  onCheckedChange={() => handlePlayerToggle(player.id)}
                  className="h-5 w-5"
                />
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={player.avatar} alt={player.name} />
                  <AvatarFallback className="text-xs">{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{player.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Rating: {player.rating.toFixed(2)} • {player.wins}W{player.draws ? `-${player.draws}D` : ''}-{player.losses}L
                  </div>
                </div>
                {selectedPlayerIds.includes(player.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))
          )}
        </div>

        {selectedPlayerIds.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Selected: {selectedPlayerIds
              .map(id => players.find(p => p.id === id)?.name)
              .filter(Boolean)
              .join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}