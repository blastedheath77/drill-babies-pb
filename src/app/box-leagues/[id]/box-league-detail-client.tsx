'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Grid3x3, Settings, Users, Calendar, Trophy, Loader2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBoxLeague, useBoxesByLeague } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import { validateCycleComplete } from '@/lib/box-league-logic';

interface BoxLeagueDetailClientProps {
  boxLeagueId: string;
}

export function BoxLeagueDetailClient({ boxLeagueId }: BoxLeagueDetailClientProps) {
  const { data: boxLeague, isLoading, error } = useBoxLeague(boxLeagueId);
  const { data: boxes = [] } = useBoxesByLeague(boxLeagueId);
  const { data: allPlayers = [] } = usePlayers();
  const [cycleValidation, setCycleValidation] = React.useState<{ complete: boolean; reason?: string } | null>(null);

  // Validate cycle completion status
  React.useEffect(() => {
    if (!boxLeague) return;

    const checkCycleComplete = async () => {
      const validation = await validateCycleComplete(boxLeagueId);
      setCycleValidation(validation);
    };

    checkCycleComplete();
  }, [boxLeague, boxLeagueId]);

  const getPlayerById = (playerId: string) => {
    return allPlayers.find(p => p.id === playerId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading box league...</span>
      </div>
    );
  }

  if (error || !boxLeague) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/box-leagues">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Box League Not Found</h1>
            <p className="text-muted-foreground">
              The box league you're looking for doesn't exist or has been deleted.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              This box league could not be found.
            </p>
            <Button asChild>
              <Link href="/box-leagues">Back to Box Leagues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/box-leagues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{boxLeague.name}</h1>
            <Badge variant={boxLeague.status === 'active' ? 'default' : 'secondary'}>
              {boxLeague.status}
            </Badge>
            {boxLeague.isTestMode && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700">
                TEST
              </Badge>
            )}
          </div>
          {boxLeague.description && (
            <p className="text-muted-foreground mt-1">{boxLeague.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/box-leagues/${boxLeagueId}/settings`}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>

      {/* League Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            League Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Boxes:</span>
              <div className="font-semibold">{boxLeague.totalBoxes}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Current Cycle:</span>
              <div className="font-semibold">{boxLeague.currentCycle}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Current Round:</span>
              <div className="font-semibold">
                {boxLeague.currentRound} of {boxLeague.roundsPerCycle}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Players Needed:</span>
              <div className="font-semibold">{boxLeague.totalBoxes * 4}</div>
            </div>
          </div>

          {/* Compact Box Overview */}
          {boxes.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">Box Assignments</h4>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/box-leagues/${boxLeagueId}/boxes`}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {boxes
                  .sort((a, b) => a.boxNumber - b.boxNumber)
                  .map((box) => (
                    <div key={box.id} className="bg-secondary/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Box {box.boxNumber}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {box.playerIds.length}/4
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {box.playerIds.length === 0 ? (
                          <div className="text-xs text-muted-foreground italic">
                            No players assigned
                          </div>
                        ) : (
                          box.playerIds.map((playerId) => {
                            const player = getPlayerById(playerId);
                            return player ? (
                              <div key={playerId} className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={player.avatar} alt={player.name} />
                                  <AvatarFallback className="text-xs">{player.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate">{player.name}</span>
                              </div>
                            ) : null;
                          })
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Cycle - Start Round Alert */}
      {boxLeague.currentRound === 0 && boxLeague.currentCycle > 1 && (
        <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-300 dark:border-blue-800">
          <ArrowRight className="h-5 w-5 text-blue-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Ready to Start Cycle {boxLeague.currentCycle}!
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Players have been moved to their new boxes. Start the first round to begin the new cycle.
                </p>
              </div>
              <Button asChild className="ml-4 shrink-0">
                <Link href={`/box-leagues/${boxLeagueId}/rounds`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Start Round
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Cycle Completion Alert */}
      {cycleValidation?.complete && (
        <Alert className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-300 dark:border-yellow-800">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Cycle {boxLeague.currentCycle} Complete!
                </div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  All rounds have been completed. Time to execute promotion/relegation and start the next cycle.
                </p>
              </div>
              <Button asChild className="ml-4 shrink-0">
                <Link href={`/box-leagues/${boxLeagueId}/cycle-completion`}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Complete Cycle
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link href={`/box-leagues/${boxLeagueId}/rounds`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Rounds & Matches</h3>
              <p className="text-sm text-muted-foreground">
                Start rounds and record results
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/box-leagues/${boxLeagueId}/standings`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Standings</h3>
              <p className="text-sm text-muted-foreground">
                View current standings and stats
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}