'use client';

import React, { useState } from 'react';
import { UserX, ArrowRight, UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubstitutePlayer } from '@/hooks/use-box-leagues';
import type { Player, BoxLeaguePlayerStats } from '@/lib/types';

interface SubstitutePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boxLeagueId: string;
  boxId: string;
  oldPlayer: Player;
  oldPlayerStats?: BoxLeaguePlayerStats;
  availablePlayers: Player[]; // Players not in the league
}

export function SubstitutePlayerDialog({
  open,
  onOpenChange,
  boxLeagueId,
  boxId,
  oldPlayer,
  oldPlayerStats,
  availablePlayers
}: SubstitutePlayerDialogProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const substituteMutation = useSubstitutePlayer();

  const handleSubmit = async () => {
    if (!selectedPlayerId) {
      alert('Please select a new player');
      return;
    }

    try {
      await substituteMutation.mutateAsync({
        boxLeagueId,
        boxId,
        oldPlayerId: oldPlayer.id,
        newPlayerId: selectedPlayerId
      });

      alert('Player substitution successful!');
      onOpenChange(false);
      setSelectedPlayerId('');
    } catch (error: any) {
      console.error('Error substituting player:', error);
      alert(`Failed to substitute player: ${error.message}`);
    }
  };

  const selectedPlayer = availablePlayers.find(p => p.id === selectedPlayerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Substitute Player</DialogTitle>
          <DialogDescription>
            Replace a player with a new player. The new player will inherit all stats and pending matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Old Player Info */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Player Being Replaced:</div>
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <UserX className="h-5 w-5 text-red-600" />
              <Avatar className="h-10 w-10">
                <AvatarImage src={oldPlayer.avatar} alt={oldPlayer.name} />
                <AvatarFallback>{oldPlayer.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{oldPlayer.name}</div>
                {oldPlayerStats && (
                  <div className="text-sm text-muted-foreground">
                    Current Stats: {oldPlayerStats.matchesWon}-{oldPlayerStats.matchesLost} •
                    Position {oldPlayerStats.currentPosition} •
                    {oldPlayerStats.totalPoints} pts
                  </div>
                )}
              </div>
            </div>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />

          {/* New Player Selection */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Select New Player:</div>
            {availablePlayers.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No available players to substitute. All players are already in this box league.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a player..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={player.avatar} alt={player.name} />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{player.name}</span>
                        <span className="text-sm text-muted-foreground">
                          (Rating: {player.rating.toFixed(0)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedPlayer && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <UserPlus className="h-5 w-5 text-green-600" />
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedPlayer.avatar} alt={selectedPlayer.name} />
                  <AvatarFallback>{selectedPlayer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{selectedPlayer.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Rating: {selectedPlayer.rating.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inheritance Info */}
          {oldPlayerStats && selectedPlayer && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">What will be inherited:</div>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Position: {oldPlayerStats.currentPosition}</li>
                    <li>Record: {oldPlayerStats.matchesWon}-{oldPlayerStats.matchesLost}</li>
                    <li>Points: {oldPlayerStats.totalPoints}</li>
                    <li>Games: {oldPlayerStats.gamesWon}-{oldPlayerStats.gamesLost}</li>
                    <li>All pending matches</li>
                  </ul>
                  <div className="text-sm text-muted-foreground mt-2">
                    Note: Completed matches will still show {oldPlayer.name}'s name (historical accuracy)
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={substituteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlayerId || substituteMutation.isPending || availablePlayers.length === 0}
          >
            {substituteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Substituting...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Confirm Substitution
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
