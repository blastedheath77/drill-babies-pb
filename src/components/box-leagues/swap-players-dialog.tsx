'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ArrowLeftRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAnalyzeSwapImpact, useSwapPlayers } from '@/hooks/use-box-leagues';
import type { Player, Box } from '@/lib/types';

interface SwapPlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boxLeagueId: string;
  player1: Player;
  box1: Box;
  player2: Player;
  box2: Box;
}

export function SwapPlayersDialog({
  open,
  onOpenChange,
  boxLeagueId,
  player1,
  box1,
  player2,
  box2,
}: SwapPlayersDialogProps) {
  const analyzeSwapImpact = useAnalyzeSwapImpact();
  const swapPlayers = useSwapPlayers();
  const [impactData, setImpactData] = useState<any>(null);

  // Analyze impact when dialog opens
  useEffect(() => {
    if (open && player1 && player2 && box1 && box2) {
      analyzeSwapImpact.mutate(
        {
          boxLeagueId,
          playerId1: player1.id,
          boxId1: box1.id,
          playerId2: player2.id,
          boxId2: box2.id,
        },
        {
          onSuccess: (data) => {
            setImpactData(data);
          },
        }
      );
    }
  }, [open, player1?.id, player2?.id, box1?.id, box2?.id]);

  const handleSwap = async () => {
    if (!impactData?.canSwap) return;

    swapPlayers.mutate(
      {
        boxLeagueId,
        playerId1: player1.id,
        boxId1: box1.id,
        playerId2: player2.id,
        boxId2: box2.id,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setImpactData(null);
        },
      }
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setImpactData(null);
  };

  const isLoading = analyzeSwapImpact.isPending || swapPlayers.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Swap Players Between Boxes</DialogTitle>
          <DialogDescription>
            Review the impact of swapping these two players before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Player Swap Preview */}
          <div className="flex items-center justify-between gap-4">
            {/* Player 1 */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={player1.avatar} alt={player1.name} />
                  <AvatarFallback>{player1.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{player1.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Rating: {player1.rating.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Badge variant="outline">Box {box1.boxNumber}</Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  → Box {box2.boxNumber}
                </div>
              </div>
            </div>

            {/* Swap Icon */}
            <ArrowLeftRight className="h-8 w-8 text-primary shrink-0" />

            {/* Player 2 */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={player2.avatar} alt={player2.name} />
                  <AvatarFallback>{player2.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{player2.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Rating: {player2.rating.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Badge variant="outline">Box {box2.boxNumber}</Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  → Box {box1.boxNumber}
                </div>
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Analyzing impact...
              </span>
            </div>
          ) : impactData ? (
            <div className="space-y-3">
              {!impactData.canSwap ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{impactData.reason}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {impactData.pendingMatchesCount > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This swap will affect {impactData.pendingMatchesCount} pending{' '}
                        {impactData.pendingMatchesCount === 1 ? 'match' : 'matches'}. These
                        matches will need to be replayed with the new player assignments.
                      </AlertDescription>
                    </Alert>
                  )}
                  {impactData.pendingMatchesCount === 0 && (
                    <Alert>
                      <AlertDescription>
                        ✓ No matches will be affected by this swap.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          ) : null}

          {/* Error Messages */}
          {analyzeSwapImpact.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to analyze swap impact. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {swapPlayers.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to swap players. Please try again.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSwap}
            disabled={isLoading || !impactData?.canSwap}
          >
            {swapPlayers.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </>
            ) : (
              'Confirm Swap'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
