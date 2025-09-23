'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Trophy, TrendingUp, TrendingDown, Calendar, Target, Users, Medal, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useBoxLeague, useBoxesByLeague, useRoundsByLeague, useMatchesByRound } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import { calculateStandings } from '@/lib/box-league-logic';
import type { BoxLeagueMatch, BoxLeagueStanding } from '@/lib/types';

interface PlayerStatsClientProps {
  boxLeagueId: string;
  playerId: string;
}

interface PlayerMatchHistory {
  roundNumber: number;
  boxNumber: number;
  matches: {
    match: BoxLeagueMatch;
    isWin: boolean;
    partnerName: string;
    opponentNames: string[];
    score: string;
  }[];
}

export function PlayerStatsClient({ boxLeagueId, playerId }: PlayerStatsClientProps) {
  const { data: boxLeague, isLoading: leagueLoading } = useBoxLeague(boxLeagueId);
  const { data: boxes = [], isLoading: boxesLoading } = useBoxesByLeague(boxLeagueId);
  const { data: rounds = [], isLoading: roundsLoading } = useRoundsByLeague(boxLeagueId);
  const { data: allPlayers = [] } = usePlayers();

  const isLoading = leagueLoading || boxesLoading || roundsLoading;

  const player = allPlayers.find(p => p.id === playerId);
  const playerBox = boxes.find(box => box.playerIds.includes(playerId));

  const getPlayerName = (id: string) => {
    return allPlayers.find(p => p.id === id)?.name || 'Unknown';
  };

  const getPlayerStats = () => {
    let totalWins = 0;
    let totalLosses = 0;
    let totalPointsFor = 0;
    let totalPointsAgainst = 0;
    let totalGamesWon = 0;
    let totalGamesLost = 0;
    const matchHistory: PlayerMatchHistory[] = [];

    rounds.forEach(round => {
      const roundMatches: PlayerMatchHistory['matches'] = [];

      // Find which box the player was in for this round
      const roundBox = boxes.find(box => box.playerIds.includes(playerId));
      if (!roundBox) return;

      // Get all matches for this round that involve the player
      round.matchIds.forEach(matchId => {
        // We'd need to fetch match data here, but for now we'll simulate
        // This would use useMatchesByRound hook for the actual match data
      });

      if (roundMatches.length > 0) {
        matchHistory.push({
          roundNumber: round.roundNumber,
          boxNumber: roundBox.boxNumber,
          matches: roundMatches
        });
      }
    });

    return {
      totalMatches: totalWins + totalLosses,
      totalWins,
      totalLosses,
      winPercentage: totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0,
      totalPointsFor,
      totalPointsAgainst,
      pointsDifference: totalPointsFor - totalPointsAgainst,
      totalGamesWon,
      totalGamesLost,
      gameWinPercentage: totalGamesWon + totalGamesLost > 0 ? (totalGamesWon / (totalGamesWon + totalGamesLost)) * 100 : 0,
      matchHistory
    };
  };

  const getCurrentStanding = (): { standing: BoxLeagueStanding; position: number } | null => {
    if (!playerBox) return null;

    try {
      const standings = calculateStandings(playerBox.id, rounds);
      const position = standings.findIndex(s => s.playerId === playerId) + 1;
      const standing = standings.find(s => s.playerId === playerId);

      return standing ? { standing, position } : null;
    } catch (error) {
      console.error('Error calculating player standing:', error);
      return null;
    }
  };

  const getPromotionStatus = () => {
    const currentStanding = getCurrentStanding();
    if (!currentStanding || !playerBox) return null;

    const { position } = currentStanding;
    const isTopBox = playerBox.boxNumber === 1;
    const isBottomBox = playerBox.boxNumber === boxLeague?.totalBoxes;

    if (isTopBox && position === 4) {
      return { type: 'relegation', icon: TrendingDown, color: 'text-red-500', text: 'At risk of relegation' };
    } else if (!isTopBox && position === 1) {
      return { type: 'promotion', icon: TrendingUp, color: 'text-green-500', text: 'In line for promotion' };
    } else if (!isBottomBox && position === 4) {
      return { type: 'relegation', icon: TrendingDown, color: 'text-red-500', text: 'At risk of relegation' };
    }

    return { type: 'stable', icon: Target, color: 'text-muted-foreground', text: 'Position stable' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading player statistics...</span>
      </div>
    );
  }

  if (!boxLeague || !player) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Player or box league not found.</p>
      </div>
    );
  }

  const stats = getPlayerStats();
  const currentStanding = getCurrentStanding();
  const promotionStatus = getPromotionStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/box-leagues/${boxLeagueId}/standings`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarImage src={player.avatar} alt={player.name} />
            <AvatarFallback className="text-xl">{player.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{player.name}</h1>
            <p className="text-muted-foreground">{boxLeague.name} Statistics</p>
            {playerBox && (
              <Badge variant="outline" className="mt-1">
                Box {playerBox.boxNumber}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Current Standing */}
      {currentStanding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Current Standing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{currentStanding.position}</div>
                <div className="text-sm text-muted-foreground">Position in Box {playerBox?.boxNumber}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{currentStanding.standing.points}</div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">
                  {currentStanding.standing.wins}-{currentStanding.standing.losses}
                </div>
                <div className="text-sm text-muted-foreground">Match Record</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">
                  {currentStanding.standing.gamesWon}-{currentStanding.standing.gamesLost}
                </div>
                <div className="text-sm text-muted-foreground">Game Record</div>
              </div>
            </div>

            {promotionStatus && (
              <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <promotionStatus.icon className={`h-5 w-5 ${promotionStatus.color}`} />
                <span className={`font-medium ${promotionStatus.color}`}>
                  {promotionStatus.text}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Match Win Rate</span>
                  <span>{stats.winPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={stats.winPercentage} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Game Win Rate</span>
                  <span>{stats.gameWinPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={stats.gameWinPercentage} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Matches Played:</span>
                <div className="font-semibold">{stats.totalMatches}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Points Difference:</span>
                <div className={`font-semibold ${stats.pointsDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.pointsDifference >= 0 ? '+' : ''}{stats.pointsDifference}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Points For:</span>
                <div className="font-semibold">{stats.totalPointsFor}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Points Against:</span>
                <div className="font-semibold">{stats.totalPointsAgainst}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Match History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.matchHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p>No matches played yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.matchHistory.map((roundHistory) => (
                <div key={roundHistory.roundNumber} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">Round {roundHistory.roundNumber}</Badge>
                    <Badge variant="secondary">Box {roundHistory.boxNumber}</Badge>
                  </div>

                  <div className="space-y-2">
                    {roundHistory.matches.map((match, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                        <div className="text-sm">
                          <span className="font-medium">{player.name} & {match.partnerName}</span>
                          <span className="text-muted-foreground"> vs </span>
                          <span>{match.opponentNames.join(' & ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">{match.score}</span>
                          <Badge variant={match.isWin ? 'default' : 'secondary'} className="text-xs">
                            {match.isWin ? 'W' : 'L'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partnership History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partnership Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>Partnership statistics will be calculated after matches are played</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}