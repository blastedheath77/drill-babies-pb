'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBoxLeague, useBoxesByLeague, usePlayerStatsByLeague } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import {
  calculatePromotionRelegation,
  executePromotionRelegation,
  validateCycleComplete,
  calculateBoxStandings
} from '@/lib/box-league-logic';
import type { PromotionRelegationMove, Box, Player } from '@/lib/types';

interface CycleCompletionClientProps {
  boxLeagueId: string;
}

interface PlayerMoveCardProps {
  move: PromotionRelegationMove;
  player: Player | undefined;
  boxes: Box[];
}

function PlayerMoveCard({ move, player, boxes }: PlayerMoveCardProps) {
  const fromBox = boxes.find(b => b.id === move.fromBoxId);
  const toBox = boxes.find(b => b.id === move.toBoxId);

  const getMoveIcon = () => {
    if (move.moveType === 'promotion') return TrendingUp;
    if (move.moveType === 'relegation') return TrendingDown;
    return Minus;
  };

  const getMoveColor = () => {
    if (move.moveType === 'promotion') return 'text-green-500';
    if (move.moveType === 'relegation') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getMoveBgColor = () => {
    if (move.moveType === 'promotion') return 'bg-green-500/10 border-green-500/20';
    if (move.moveType === 'relegation') return 'bg-red-500/10 border-red-500/20';
    return 'bg-secondary/50 border-secondary';
  };

  const MoveIcon = getMoveIcon();

  if (!player) return null;

  return (
    <div className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${getMoveBgColor()}`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={player.avatar} alt={player.name} />
          <AvatarFallback className="text-sm">{player.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{player.name}</div>
          <div className="text-xs text-muted-foreground truncate">{move.reason}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs px-2 py-0.5">Box {move.fromBoxNumber}</Badge>
        <MoveIcon className={`h-4 w-4 ${getMoveColor()} shrink-0`} />
        <Badge variant="outline" className="text-xs px-2 py-0.5">Box {move.toBoxNumber}</Badge>
      </div>
    </div>
  );
}

export function CycleCompletionClient({ boxLeagueId }: CycleCompletionClientProps) {
  const router = useRouter();
  const { data: boxLeague, isLoading: leagueLoading } = useBoxLeague(boxLeagueId);
  const { data: boxes = [], isLoading: boxesLoading } = useBoxesByLeague(boxLeagueId);
  const { data: playerStats = [], isLoading: statsLoading } = usePlayerStatsByLeague(boxLeagueId);
  const { data: allPlayers = [] } = usePlayers();

  const [moves, setMoves] = useState<PromotionRelegationMove[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [promotionRelegationResult, setPromotionRelegationResult] = useState<any>(null);

  const isLoading = leagueLoading || boxesLoading || statsLoading;

  // Calculate promotion/relegation on load
  useEffect(() => {
    if (!boxLeague || !boxes.length || isCalculating) return;

    const calculate = async () => {
      setIsCalculating(true);
      setError(null);

      try {
        // Check if cycle is complete
        const validation = await validateCycleComplete(boxLeagueId);
        if (!validation.complete) {
          setError(validation.reason || `Cycle is not complete. Current round: ${boxLeague.currentRound}/${boxLeague.roundsPerCycle}`);
          return;
        }

        // Calculate promotion/relegation
        console.log('Calculating promotion/relegation for league:', boxLeagueId);
        console.log('Boxes:', boxes.length);
        console.log('Player stats:', playerStats.length);
        const result = await calculatePromotionRelegation(boxLeagueId);
        console.log('Promotion/relegation result:', result);
        setMoves(result.moves);
        setPromotionRelegationResult(result);
      } catch (err: any) {
        console.error('Error calculating promotion/relegation:', err);
        setError(err.message || 'Failed to calculate promotion/relegation');
      } finally {
        setIsCalculating(false);
      }
    };

    calculate();
  }, [boxLeague, boxes, playerStats, boxLeagueId]);

  const handleExecutePromotionRelegation = async () => {
    if (!promotionRelegationResult) return;

    setIsExecuting(true);
    setError(null);

    try {
      await executePromotionRelegation(boxLeagueId, promotionRelegationResult);

      // Success! Redirect to rounds page to show the new round
      alert(`Cycle ${promotionRelegationResult.newCycleNumber} started successfully!\n\nPlayers have been moved to their new boxes and the first round has been created.`);
      router.push(`/box-leagues/${boxLeagueId}/rounds`);
    } catch (err: any) {
      console.error('Error executing promotion/relegation:', err);
      setError(err.message || 'Failed to execute promotion/relegation');
    } finally {
      setIsExecuting(false);
      setShowConfirmDialog(false);
    }
  };

  const getPlayerById = (playerId: string) => {
    return allPlayers.find(p => p.id === playerId);
  };

  const groupMovesByType = () => {
    return {
      promotions: moves.filter(m => m.moveType === 'promotion'),
      relegations: moves.filter(m => m.moveType === 'relegation'),
      staying: moves.filter(m => m.moveType === 'stay')
    };
  };

  const { promotions, relegations, staying } = groupMovesByType();

  // Get final standings for each box
  const getBoxStandings = (boxId: string) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return [];

    const boxPlayerStats = playerStats.filter(s => s.boxId === boxId);
    if (boxPlayerStats.length === 0) return [];

    // Calculate standings
    try {
      return calculateBoxStandings(boxPlayerStats, []);
    } catch (err) {
      console.error('Error calculating box standings:', err);
      return [];
    }
  };

  if (isLoading || isCalculating) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading cycle completion data...</span>
      </div>
    );
  }

  if (!boxLeague) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Box league not found.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href={`/box-leagues/${boxLeagueId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to League
            </Button>
          </Link>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button onClick={() => router.push(`/box-leagues/${boxLeagueId}`)}>
            Return to League
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/box-leagues/${boxLeagueId}`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Cycle {boxLeague.currentCycle} Complete!</h1>
          <p className="text-base text-muted-foreground truncate">{boxLeague.name}</p>
        </div>
      </div>

      {/* Final Standings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
            Final Standings - Cycle {boxLeague.currentCycle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {boxes.sort((a, b) => a.boxNumber - b.boxNumber).map(box => {
              const standings = getBoxStandings(box.id);

              return (
                <div key={box.id} className="space-y-2">
                  <h3 className="font-semibold text-lg sm:text-xl mb-3">Box {box.boxNumber}</h3>

                  {/* Column Headers */}
                  <div className="flex items-center justify-between gap-2 pl-1 pr-2 pb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 shrink-0"></div>
                      <div className="w-7 shrink-0"></div>
                      <span className="text-xs font-medium text-muted-foreground">Player</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center w-10">
                        <span className="text-xs font-medium text-muted-foreground">Pts</span>
                      </div>
                      <div className="text-center w-12">
                        <span className="text-xs font-medium text-muted-foreground">W-L</span>
                      </div>
                      <div className="text-center w-12">
                        <span className="text-xs font-medium text-muted-foreground">Diff</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {standings.map((standing, index) => {
                      const player = getPlayerById(standing.playerId);
                      if (!player) return null;

                      // Determine rank badge color based on promotion/relegation
                      const isTopBox = box.boxNumber === 1;
                      const isBottomBox = box.boxNumber === boxes.length;
                      const isFirstPlace = index === 0;
                      const isLastPlace = index === 3;

                      let rankBadgeClass = "border-border";
                      if (isFirstPlace && !isTopBox) {
                        // Promoted player (green)
                        rankBadgeClass = "border-green-600 text-green-600 bg-green-500/10";
                      } else if (isLastPlace && !isBottomBox) {
                        // Relegated player (red)
                        rankBadgeClass = "border-red-600 text-red-600 bg-red-500/10";
                      }

                      return (
                        <div
                          key={standing.playerId}
                          className="flex items-center justify-between gap-2 pl-1 pr-2 py-2 bg-secondary/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Badge variant="outline" className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${rankBadgeClass}`}>
                              {index + 1}
                            </Badge>
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={player.avatar} alt={player.name} />
                              <AvatarFallback className="text-xs">{player.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm truncate">{player.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-center w-10">
                              <span className="font-semibold text-base">{standing.totalPoints}</span>
                            </div>
                            <div className="text-center w-12">
                              <span className="font-semibold text-base">{standing.matchesWon}-{standing.matchesLost}</span>
                            </div>
                            <div className="text-center w-12">
                              <span className={`font-semibold text-base ${standing.pointsDifference > 0 ? 'text-green-600' : standing.pointsDifference < 0 ? 'text-red-600' : ''}`}>
                                {standing.pointsDifference > 0 ? '+' : ''}{standing.pointsDifference}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Player Movements */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            Player Movements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {promotions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-green-600 flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-5 w-5" />
                Promotions ({promotions.length})
              </h3>
              {promotions.map(move => (
                <PlayerMoveCard
                  key={move.playerId}
                  move={move}
                  player={getPlayerById(move.playerId)}
                  boxes={boxes}
                />
              ))}
            </div>
          )}

          {relegations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-red-600 flex items-center gap-2 text-base sm:text-lg">
                <TrendingDown className="h-5 w-5" />
                Relegations ({relegations.length})
              </h3>
              {relegations.map(move => (
                <PlayerMoveCard
                  key={move.playerId}
                  move={move}
                  player={getPlayerById(move.playerId)}
                  boxes={boxes}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execute Button */}
      <div className="flex justify-center pt-2">
        <Button
          size="lg"
          onClick={() => setShowConfirmDialog(true)}
          disabled={isExecuting || moves.length === 0}
          className="w-full md:w-auto text-base py-6"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Execute Promotion/Relegation & Start Cycle {boxLeague.currentCycle + 1}</span>
              <span className="sm:hidden">Execute & Start Cycle {boxLeague.currentCycle + 1}</span>
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Promotion/Relegation</DialogTitle>
            <DialogDescription>
              This will move players to their new boxes and start Cycle {boxLeague.currentCycle + 1}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">Summary:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>{promotions.length} player(s) will be promoted</li>
              <li>{relegations.length} player(s) will be relegated</li>
              <li>All player stats will be reset for the new cycle</li>
              <li>Position history will be recorded</li>
              <li>First round of the new cycle will be automatically created</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isExecuting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecutePromotionRelegation}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                'Confirm & Execute'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
