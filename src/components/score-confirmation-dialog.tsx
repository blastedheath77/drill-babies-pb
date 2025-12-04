'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Player } from '@/lib/types';

interface ScoreConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  gameType: 'singles' | 'doubles';
  team1Players: Player[];
  team2Players: Player[];
  team1Score: number;
  team2Score: number;
}

export function ScoreConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  gameType,
  team1Players,
  team2Players,
  team1Score,
  team2Score,
}: ScoreConfirmationDialogProps) {
  const team1Won = team1Score > team2Score;
  const isDraw = team1Score === team2Score;

  const getTeamNames = (players: Player[]) => {
    return players.map(p => p.name).join(' & ');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Game Score</AlertDialogTitle>
          <AlertDialogDescription>
            Please verify the game details before submitting.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Game Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Game Type:</span>
            <Badge variant="outline" className="capitalize">
              {gameType}
            </Badge>
          </div>

          {/* Team 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Team 1</span>
              <span className={`text-2xl font-bold ${team1Won ? 'text-green-600' : isDraw ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                {team1Score}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {team1Players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-2">
                  {index > 0 && <span className="text-muted-foreground">&</span>}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback className="text-xs">
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{player.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <div className="h-px flex-1 bg-border" />
            <span className="px-3 text-xs font-medium text-muted-foreground">VS</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Team 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Team 2</span>
              <span className={`text-2xl font-bold ${!team1Won && !isDraw ? 'text-green-600' : 'text-muted-foreground'}`}>
                {team2Score}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {team2Players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-2">
                  {index > 0 && <span className="text-muted-foreground">&</span>}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback className="text-xs">
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{player.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-sm font-medium">
              {isDraw ? (
                'Game ended in a draw'
              ) : (
                <>
                  <span className="text-green-600">{getTeamNames(team1Won ? team1Players : team2Players)}</span>
                  {' wins '}
                  <span className="font-bold">{team1Won ? team1Score : team2Score} - {team1Won ? team2Score : team1Score}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm & Submit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
