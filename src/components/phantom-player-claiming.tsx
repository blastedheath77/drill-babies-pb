'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Trophy, Users, Calendar, Star } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';

interface ClaimablePlayer extends Player {
  canClaim: boolean;
  claimError?: string;
  gamesPlayed: number;
  currentRating: number;
}

interface PhantomPlayerClaimingProps {
  claimablePlayers: ClaimablePlayer[];
  onPlayersSelected: (selectedPlayerIds: string[]) => void;
  onSkip: () => void;
  isLoading?: boolean;
  className?: string;
}

export function PhantomPlayerClaiming({
  claimablePlayers,
  onPlayersSelected,
  onSkip,
  isLoading = false,
  className
}: PhantomPlayerClaimingProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  
  console.log('🎭 PhantomPlayerClaiming props:', { 
    claimablePlayersCount: claimablePlayers.length,
    claimablePlayers: claimablePlayers.map(p => ({ id: p.id, name: p.name, canClaim: p.canClaim, email: p.email }))
  });
  
  const handlePlayerSelection = (playerId: string, checked: boolean) => {
    console.log('🔄 Player selection changed:', { playerId, checked, currentSelection: Array.from(selectedPlayers) });
    const newSelection = new Set(selectedPlayers);
    if (checked) {
      newSelection.add(playerId);
    } else {
      newSelection.delete(playerId);
    }
    console.log('✅ New selection:', Array.from(newSelection));
    setSelectedPlayers(newSelection);
  };

  const handleSelectAll = () => {
    const claimablePlayerIds = claimablePlayers
      .filter(p => p.canClaim)
      .map(p => p.id);
    setSelectedPlayers(new Set(claimablePlayerIds));
  };

  const handleDeselectAll = () => {
    setSelectedPlayers(new Set());
  };

  const handleConfirmSelection = () => {
    const selectedArray = Array.from(selectedPlayers);
    console.log('🎯 Confirming selection:', selectedArray);
    onPlayersSelected(selectedArray);
  };

  const totalGames = claimablePlayers.reduce((sum, player) => sum + player.gamesPlayed, 0);
  const claimablePlayersCount = claimablePlayers.filter(p => p.canClaim).length;

  if (claimablePlayers.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                Great news! We found your game history
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                {claimablePlayers.length} player profile{claimablePlayers.length > 1 ? 's' : ''} 
                {' '}with {totalGames} total games found for your email address
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {claimablePlayersCount > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isLoading}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={isLoading}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedPlayers.size} of {claimablePlayersCount} selected
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Player Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {claimablePlayers.map((player) => (
          <ClaimablePlayerCard
            key={player.id}
            player={player}
            isSelected={selectedPlayers.has(player.id)}
            onSelectionChange={(checked) => handlePlayerSelection(player.id, checked)}
            disabled={!player.canClaim || isLoading}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={isLoading}
        >
          Skip for now
        </Button>
        
        <div className="space-x-3">
          {selectedPlayers.size > 0 && (
            <div className="inline-flex items-center text-sm text-muted-foreground">
              Claiming {selectedPlayers.size} profile{selectedPlayers.size > 1 ? 's' : ''}
            </div>
          )}
          <Button
            onClick={handleConfirmSelection}
            disabled={selectedPlayers.size === 0 || isLoading}
          >
            {isLoading ? 'Claiming...' : `Claim Selected Players`}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ClaimablePlayerCardProps {
  player: ClaimablePlayer;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ClaimablePlayerCard({
  player,
  isSelected,
  onSelectionChange,
  disabled = false
}: ClaimablePlayerCardProps) {
  const winPercentage = player.gamesPlayed > 0 
    ? Math.round((player.wins / player.gamesPlayed) * 100) 
    : 0;

  return (
    <Card className={cn(
      'relative transition-all duration-200',
      isSelected && 'ring-2 ring-blue-500 border-blue-300',
      disabled && 'opacity-60 cursor-not-allowed',
      !disabled && 'hover:shadow-md cursor-pointer'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          {!disabled && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              className="mt-1"
            />
          )}
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={player.avatar} alt={player.name} />
            <AvatarFallback>
              {player.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {player.name}
            </CardTitle>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {player.currentRating.toFixed(1)} rating
              </Badge>
              {player.email && (
                <Badge variant="outline" className="text-xs">
                  Claimable
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Game Statistics */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{player.gamesPlayed} games</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span>{winPercentage}% wins</span>
          </div>
        </div>

        <Separator />

        {/* Performance Summary */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wins</span>
            <span className="font-medium text-green-600">{player.wins}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Losses</span>
            <span className="font-medium text-red-600">{player.losses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Points</span>
            <span className="font-medium">{player.pointsFor} - {player.pointsAgainst}</span>
          </div>
        </div>

        {/* Claim Error */}
        {player.claimError && (
          <Alert className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {player.claimError}
            </AlertDescription>
          </Alert>
        )}

        {/* Preview of what claiming will do */}
        {player.canClaim && isSelected && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
              You'll inherit:
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <div>• {player.gamesPlayed} game history</div>
              <div>• {player.currentRating.toFixed(1)} current rating</div>
              <div>• All win/loss statistics</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PhantomPlayerClaiming;