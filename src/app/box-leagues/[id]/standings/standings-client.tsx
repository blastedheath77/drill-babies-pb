'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Medal, TrendingUp, TrendingDown, Minus, Users, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBoxLeague, useBoxesByLeague, useRoundsByLeague, usePlayerStatsByBox, useMatchesByBox } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import { calculateBoxStandings } from '@/lib/box-league-logic';
import type { BoxLeagueStanding, Player } from '@/lib/types';

interface StandingsClientProps {
  boxLeagueId: string;
}

interface BoxStandingsCardProps {
  box: any;
  boxLeague: any;
  boxLeagueId: string;
  allPlayers: Player[];
}

interface StandingRowProps {
  standing: BoxLeagueStanding;
  player: Player;
  position: number;
  boxNumber: number;
  totalPlayers: number;
  boxLeagueId: string;
}

function BoxStandingsCard({ box, boxLeague, boxLeagueId, allPlayers }: BoxStandingsCardProps) {
  const { data: playerStats = [] } = usePlayerStatsByBox(box.id);
  const { data: matches = [] } = useMatchesByBox(box.id);

  const getPlayerById = (playerId: string): Player | undefined => {
    return allPlayers.find(p => p.id === playerId);
  };

  const getStandingsForBox = (): BoxLeagueStanding[] => {
    try {
      return calculateBoxStandings(playerStats, matches);
    } catch (error) {
      console.error('Error calculating standings for box:', box.id, error);
      return [];
    }
  };

  const standings = getStandingsForBox();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">
          Box {box.boxNumber}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2" />
            <p>No matches played yet</p>
          </div>
        ) : (
          <div className="space-y-2">
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
                return player ? (
                  <StandingRow
                    key={standing.playerId}
                    standing={standing}
                    player={player}
                    position={index + 1}
                    boxNumber={box.boxNumber}
                    totalPlayers={standings.length}
                    boxLeagueId={boxLeagueId}
                  />
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StandingRow({ standing, player, position, boxNumber, totalPlayers, boxLeagueId }: StandingRowProps) {
  // Determine rank badge color based on promotion/relegation
  const isTopBox = boxNumber === 1;
  const isFirstPlace = position === 1;
  const isLastPlace = position === 4;

  let rankBadgeClass = "border-border";
  if (isFirstPlace && !isTopBox) {
    // Promoted player (green)
    rankBadgeClass = "border-green-600 text-green-600 bg-green-500/10";
  } else if (isLastPlace) {
    // Relegated player (red)
    rankBadgeClass = "border-red-600 text-red-600 bg-red-500/10";
  }

  return (
    <div className="flex items-center justify-between gap-2 pl-1 pr-2 py-2 bg-secondary/30 rounded-lg">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Badge variant="outline" className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${rankBadgeClass}`}>
          {position}
        </Badge>
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={player.avatar} alt={player.name} />
          <AvatarFallback className="text-xs">{player.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <Link
          href={`/box-leagues/${boxLeagueId}/players/${player.id}`}
          className="font-medium text-sm truncate hover:underline hover:text-primary"
        >
          {player.name}
        </Link>
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
}

export function StandingsClient({ boxLeagueId }: StandingsClientProps) {
  const { data: boxLeague, isLoading: leagueLoading } = useBoxLeague(boxLeagueId);
  const { data: boxes = [], isLoading: boxesLoading } = useBoxesByLeague(boxLeagueId);
  const { data: rounds = [], isLoading: roundsLoading } = useRoundsByLeague(boxLeagueId);
  const { data: allPlayers = [] } = usePlayers();

  const isLoading = leagueLoading || boxesLoading || roundsLoading;

  const getTotalMatches = () => {
    return rounds.reduce((total, round) => total + round.matchIds.length, 0);
  };

  const getCompletedMatches = () => {
    // This would need to be calculated from actual match data
    // For now, return 0 as placeholder
    return 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading standings...</span>
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
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Standings - Cycle {boxLeague.currentCycle}</h1>
          <p className="text-base text-muted-foreground truncate">{boxLeague.name}</p>
        </div>
      </div>

      {/* League Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            League Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current Cycle:</span>
              <div className="font-semibold text-lg">{boxLeague.currentCycle}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Current Round:</span>
              <div className="font-semibold text-lg">
                {boxLeague.currentRound === 0 ? 'Not Started' : `${boxLeague.currentRound} of ${boxLeague.roundsPerCycle}`}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Players:</span>
              <div className="font-semibold text-lg">{boxLeague.totalBoxes * 4}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Matches:</span>
              <div className="font-semibold text-lg">{getCompletedMatches()} / {getTotalMatches()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Standings Yet */}
      {boxLeague.currentRound === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Standings Yet</h3>
            <p className="text-muted-foreground mb-4">
              Standings will appear once the first round has started and matches are being played.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href={`/box-leagues/${boxLeagueId}/boxes`}>
                  <Users className="h-4 w-4 mr-2" />
                  Set Up Boxes
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/box-leagues/${boxLeagueId}/rounds`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Start Rounds
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Box Standings */}
      {boxLeague.currentRound > 0 && (
        <div className="space-y-6">
          {boxes
            .sort((a, b) => a.boxNumber - b.boxNumber)
            .map((box) => (
              <BoxStandingsCard
                key={box.id}
                box={box}
                boxLeague={boxLeague}
                boxLeagueId={boxLeagueId}
                allPlayers={allPlayers}
              />
            ))}
        </div>
      )}

      {/* Promotion/Relegation Info */}
      {boxLeague.currentRound > 0 && boxLeague.totalBoxes > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Promotion & Relegation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Promotion</span>
                </div>
                <p className="text-muted-foreground">
                  1st place in each box (except top box) moves up one box
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Relegation</span>
                </div>
                <p className="text-muted-foreground">
                  4th place in each box (except bottom box) moves down one box
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}