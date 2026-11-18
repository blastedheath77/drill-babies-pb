'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Calendar, Target, Users, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { useBoxLeague, useBoxesByLeague, usePlayerStatsByLeague, useMatchesByBox } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import { useClub } from '@/contexts/club-context';
import { calculateBoxStandings } from '@/lib/box-league-logic';
import type { BoxLeagueMatch, BoxLeagueStanding } from '@/lib/types';

interface PlayerStatsClientProps {
  boxLeagueId: string;
  playerId: string;
}

function PositionTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { label: string; position: number; boxNumber: number };
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold">{d.label}</p>
      <p>Position <strong>{d.position}</strong> in Box {d.boxNumber}</p>
    </div>
  );
}

export function PlayerStatsClient({ boxLeagueId, playerId }: PlayerStatsClientProps) {
  const { selectedClub } = useClub();
  const { data: boxLeague, isLoading: leagueLoading } = useBoxLeague(boxLeagueId);
  const { data: boxes = [], isLoading: boxesLoading } = useBoxesByLeague(boxLeagueId);
  const { data: allPlayerStats = [], isLoading: statsLoading } = usePlayerStatsByLeague(boxLeagueId);
  const { data: allPlayers = [] } = usePlayers(selectedClub?.id);

  const player = allPlayers.find(p => p.id === playerId);
  const playerBox = boxes.find(box => box.playerIds.includes(playerId));
  const playerStats = allPlayerStats.find(s => s.playerId === playerId);

  const { data: boxMatches = [], isLoading: matchesLoading } = useMatchesByBox(playerBox?.id || '');

  const isLoading = leagueLoading || boxesLoading || statsLoading || matchesLoading;

  const getPlayerName = (id: string) => allPlayers.find(p => p.id === id)?.name || 'Unknown';

  const getCurrentStanding = (): { standing: BoxLeagueStanding; position: number } | null => {
    if (!playerBox) return null;
    const boxStats = allPlayerStats.filter(s => s.boxId === playerBox.id);
    if (boxStats.length < 2) return null;
    try {
      const standings = calculateBoxStandings(boxStats, []);
      const idx = standings.findIndex(s => s.playerId === playerId);
      if (idx === -1) return null;
      return { standing: standings[idx], position: idx + 1 };
    } catch {
      return null;
    }
  };

  const getPromotionStatus = () => {
    const current = getCurrentStanding();
    if (!current || !playerBox || !boxLeague) return null;
    const { position } = current;
    const boxSize = playerBox.playerIds.length;
    const isTopBox = playerBox.boxNumber === 1;
    const isBottomBox = playerBox.boxNumber === boxLeague.totalBoxes;
    if (position === 1 && !isTopBox) return { icon: TrendingUp, color: 'text-green-500', text: 'In line for promotion' };
    if (position === boxSize && !isBottomBox) return { icon: TrendingDown, color: 'text-red-500', text: 'At risk of relegation' };
    if (position === 1 && isTopBox) return { icon: Trophy, color: 'text-yellow-500', text: 'Leading the top box' };
    return { icon: Target, color: 'text-muted-foreground', text: 'Position stable' };
  };

  const getChartData = () => {
    if (!playerStats) return [];
    const data = playerStats.positionHistory.map(h => ({
      label: `Cycle ${h.cycle}`,
      position: h.position,
      boxNumber: h.boxNumber,
    }));
    const current = getCurrentStanding();
    if (current && boxLeague && playerBox) {
      data.push({
        label: `Cycle ${boxLeague.currentCycle}${boxLeague.currentRound > 0 ? ' (now)' : ''}`,
        position: current.position,
        boxNumber: playerBox.boxNumber,
      });
    }
    return data;
  };

  const getPlayerMatches = () =>
    boxMatches
      .filter(m =>
        m.status === 'completed' &&
        (m.team1PlayerIds.includes(playerId) || m.team2PlayerIds.includes(playerId))
      )
      .sort((a, b) => {
        if (a.cycleNumber !== b.cycleNumber) return b.cycleNumber - a.cycleNumber;
        if (a.roundNumber !== b.roundNumber) return b.roundNumber - a.roundNumber;
        return a.matchNumber - b.matchNumber;
      });

  const groupMatchesByRound = (matches: BoxLeagueMatch[]) => {
    const groups: Record<string, { cycleNumber: number; roundNumber: number; matches: BoxLeagueMatch[] }> = {};
    for (const m of matches) {
      const key = `${m.cycleNumber}_${m.roundNumber}`;
      if (!groups[key]) groups[key] = { cycleNumber: m.cycleNumber, roundNumber: m.roundNumber, matches: [] };
      groups[key].matches.push(m);
    }
    return Object.values(groups).sort((a, b) => {
      if (a.cycleNumber !== b.cycleNumber) return b.cycleNumber - a.cycleNumber;
      return b.roundNumber - a.roundNumber;
    });
  };

  const getPartnerData = () => {
    if (!playerStats) return [];
    return Object.entries(playerStats.partnerStats || {})
      .map(([partnerId, record]) => ({
        partnerId,
        partnerName: getPlayerName(partnerId),
        wins: record.wins,
        losses: record.losses,
        total: record.wins + record.losses,
        winRate: (record.wins + record.losses) > 0 ? (record.wins / (record.wins + record.losses)) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
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

  const currentStanding = getCurrentStanding();
  const promotionStatus = getPromotionStatus();
  const chartData = getChartData();
  const playerMatches = getPlayerMatches();
  const matchGroups = groupMatchesByRound(playerMatches);
  const partnerData = getPartnerData();
  const matchWinPct = playerStats && playerStats.matchesPlayed > 0
    ? (playerStats.matchesWon / playerStats.matchesPlayed) * 100 : 0;
  const gameWinPct = playerStats && (playerStats.gamesWon + playerStats.gamesLost) > 0
    ? (playerStats.gamesWon / (playerStats.gamesWon + playerStats.gamesLost)) * 100 : 0;

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
                <div className="text-2xl font-semibold">{currentStanding.standing.totalPoints}</div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">
                  {currentStanding.standing.matchesWon}-{currentStanding.standing.matchesLost}
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

      {/* Position History Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Position History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  reversed
                  domain={[1, 4]}
                  ticks={[1, 2, 3, 4]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Position', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }}
                />
                <Tooltip content={<PositionTooltip />} />
                <Line
                  type="monotone"
                  dataKey="position"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">Lower position number = higher ranking (1 = best)</p>
          </CardContent>
        </Card>
      )}

      {/* This Cycle Statistics */}
      {playerStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              This Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Match Win Rate</span>
                    <span>{matchWinPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={matchWinPct} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Game Win Rate</span>
                    <span>{gameWinPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={gameWinPct} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Matches:</span>
                  <div className="font-semibold">{playerStats.matchesWon}W – {playerStats.matchesLost}L</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Points Diff:</span>
                  <div className={`font-semibold ${(playerStats.pointsFor - playerStats.pointsAgainst) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {playerStats.pointsFor - playerStats.pointsAgainst >= 0 ? '+' : ''}{playerStats.pointsFor - playerStats.pointsAgainst}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Points For:</span>
                  <div className="font-semibold">{playerStats.pointsFor}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Points Against:</span>
                  <div className="font-semibold">{playerStats.pointsAgainst}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Match History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matchGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p>No matches played yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchGroups.map(group => (
                <div key={`${group.cycleNumber}_${group.roundNumber}`} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">Cycle {group.cycleNumber}</Badge>
                    <Badge variant="secondary">Round {group.roundNumber}</Badge>
                  </div>
                  <div className="space-y-2">
                    {group.matches.map(match => {
                      const onTeam1 = match.team1PlayerIds.includes(playerId);
                      const isWin = onTeam1
                        ? match.team1Score > match.team2Score
                        : match.team2Score > match.team1Score;
                      const myTeam = onTeam1 ? match.team1PlayerIds : match.team2PlayerIds;
                      const opponents = onTeam1 ? match.team2PlayerIds : match.team1PlayerIds;
                      const partners = myTeam.filter(id => id !== playerId);
                      const myScore = onTeam1 ? match.team1Score : match.team2Score;
                      const oppScore = onTeam1 ? match.team2Score : match.team1Score;
                      return (
                        <div key={match.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded gap-2">
                          <div className="text-sm min-w-0 flex-1">
                            <span className="font-medium">
                              {[player.name, ...partners.map(getPlayerName)].join(' & ')}
                            </span>
                            <span className="text-muted-foreground"> vs </span>
                            <span>{opponents.map(getPlayerName).join(' & ')}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-mono">{myScore} – {oppScore}</span>
                            <Badge variant={isWin ? 'default' : 'secondary'} className="text-xs w-5 flex items-center justify-center">
                              {isWin ? 'W' : 'L'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partnership Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partnership Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partnerData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>No partnership data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partnerData.map(p => (
                <div key={p.partnerId} className="flex items-center justify-between gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>{p.partnerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.partnerName}</div>
                      <div className="text-xs text-muted-foreground">{p.total} matches together</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">{p.wins}W – {p.losses}L</div>
                    <div className="text-xs text-muted-foreground">{p.winRate.toFixed(0)}% win rate</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
