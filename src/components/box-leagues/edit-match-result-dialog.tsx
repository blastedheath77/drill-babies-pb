'use client';

import React, { useState, useEffect } from 'react';
import { Edit, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEditMatchResult } from '@/hooks/use-box-leagues';
import type { BoxLeagueMatch, Player } from '@/lib/types';

interface EditMatchResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: BoxLeagueMatch;
  team1Players: Player[];
  team2Players: Player[];
}

export function EditMatchResultDialog({
  open,
  onOpenChange,
  match,
  team1Players,
  team2Players
}: EditMatchResultDialogProps) {
  const [team1Score, setTeam1Score] = useState(match.team1Score || 0);
  const [team2Score, setTeam2Score] = useState(match.team2Score || 0);
  const [error, setError] = useState<string>('');

  const editMutation = useEditMatchResult();

  // Reset scores when dialog opens or match changes
  useEffect(() => {
    if (open) {
      setTeam1Score(match.team1Score || 0);
      setTeam2Score(match.team2Score || 0);
      setError('');
    }
  }, [open, match]);

  const handleSubmit = async () => {
    // Validation
    if (team1Score === team2Score) {
      setError('Games cannot end in a tie. One team must win.');
      return;
    }
    if (team1Score < 0 || team2Score < 0) {
      setError('Scores cannot be negative.');
      return;
    }
    if (team1Score === match.team1Score && team2Score === match.team2Score) {
      setError('No changes made to the scores.');
      return;
    }

    setError('');

    try {
      await editMutation.mutateAsync({
        match,
        newTeam1Score: team1Score,
        newTeam2Score: team2Score
      });

      alert('Match result updated successfully!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error editing match result:', error);
      setError(error.message || 'Failed to update match result.');
    }
  };

  const hasChanges = team1Score !== match.team1Score || team2Score !== match.team2Score;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Match Result</DialogTitle>
          <DialogDescription>
            Update the match result. All player statistics will be automatically recalculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Result */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Current Result:</div>
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {team1Players.map(player => (
                    <Avatar key={player.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={player.avatar} alt={player.name} />
                      <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="text-sm font-medium">
                  {team1Players.map(p => p.name).join(' & ')}
                </div>
              </div>
              <div className="text-2xl font-bold">
                {match.team1Score} - {match.team2Score}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-right">
                  {team2Players.map(p => p.name).join(' & ')}
                </div>
                <div className="flex -space-x-2">
                  {team2Players.map(player => (
                    <Avatar key={player.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={player.avatar} alt={player.name} />
                      <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* New Scores Input */}
          <div className="space-y-4">
            <div className="text-sm font-medium">Enter New Scores:</div>
            <div className="flex items-center justify-center gap-6">
              <div className="space-y-2 flex-1">
                <Label htmlFor="team1Score" className="text-center block">
                  Team 1
                </Label>
                <Input
                  id="team1Score"
                  type="number"
                  min="0"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                  className="text-center text-2xl font-bold h-16"
                />
              </div>

              <div className="text-3xl font-bold text-muted-foreground pt-8">-</div>

              <div className="space-y-2 flex-1">
                <Label htmlFor="team2Score" className="text-center block">
                  Team 2
                </Label>
                <Input
                  id="team2Score"
                  type="number"
                  min="0"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                  className="text-center text-2xl font-bold h-16"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Warning about recalculation */}
          {hasChanges && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">What will be updated:</div>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Match score will be updated to {team1Score} - {team2Score}</li>
                    <li>All player statistics will be recalculated</li>
                    <li>Win/loss records will be adjusted</li>
                    <li>Point differentials will be updated</li>
                    <li>Standings will reflect the new result</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={editMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || editMutation.isPending}
          >
            {editMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Update Result
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
