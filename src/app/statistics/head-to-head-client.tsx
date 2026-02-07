'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Swords,
} from 'lucide-react';
import type { Player, Game } from '@/lib/types';
import { getHeadToHeadStats } from '@/lib/data';
import { usePartnershipsData } from '@/hooks/use-games';
import { useCircles } from '@/hooks/use-circles';
import { useClub } from '@/contexts/club-context';
import { Loader2, AlertCircle } from 'lucide-react';
import type { DateFilter } from './rankings-client';

interface HeadToHeadClientProps {
  selectedCircleId: string | null;
  dateFilter: DateFilter;
  customStartDate: string;
  customEndDate: string;
}

export function HeadToHeadClient({
  selectedCircleId,
  dateFilter,
  customStartDate,
  customEndDate,
}: HeadToHeadClientProps) {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { games: allGames, players: allPlayers, isLoading, error } = usePartnershipsData(selectedClub?.id);
  const { data: circles } = useCircles(selectedClub?.id);

  // Filter players by circle
  const players = React.useMemo(() => {
    if (!allPlayers) return allPlayers;
    if (!selectedCircleId || !circles) return allPlayers;
    const circle = circles.find(c => c.id === selectedCircleId);
    if (!circle) return allPlayers;
    return allPlayers.filter(p => circle.playerIds.includes(p.id));
  }, [allPlayers, selectedCircleId, circles]);

  // Filter games by date range
  const games = React.useMemo(() => {
    if (!allGames || dateFilter === 'all') return allGames;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let start: Date | null = null;
    let end: Date | null = now;

    if (dateFilter === '2weeks') {
      start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === '1month') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === '2months') {
      start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'custom') {
      start = customStartDate ? new Date(customStartDate) : null;
      end = customEndDate ? new Date(customEndDate) : null;
    }

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return allGames.filter(game => {
      const gameDate = new Date(game.date);
      if (start && gameDate < start) return false;
      if (end && gameDate > end) return false;
      return true;
    });
  }, [allGames, dateFilter, customStartDate, customEndDate]);

  const [player1Id, setPlayer1Id] = React.useState<string>('');
  const [player2Id, setPlayer2Id] = React.useState<string>('');

  // Calculate head-to-head stats
  const h2hStats = React.useMemo(() => {
    if (!player1Id || !player2Id || player1Id === player2Id || !games) return null;

    const stats1 = getHeadToHeadStats(player1Id, player2Id, games);
    const stats2 = getHeadToHeadStats(player2Id, player1Id, games);

    return {
      player1Stats: stats1,
      player2Stats: stats2
    };
  }, [player1Id, player2Id, games]);

  // Calculate matchup analysis
  const matchupAnalysis = React.useMemo(() => {
    if (!player1Id || !player2Id || !h2hStats || !games) return null;

    const h2hGames = games.filter(game =>
      game.playerIds.includes(player1Id) &&
      game.playerIds.includes(player2Id)
    ).filter(game => {
      const player1Team1 = game.team1.playerIds.includes(player1Id);
      const player2Team1 = game.team1.playerIds.includes(player2Id);
      return player1Team1 !== player2Team1;
    });

    let p1PointsFor = 0;
    let p1PointsAgainst = 0;

    const recentGames = h2hGames.slice(0, 10).map(game => {
      const player1Team = game.team1.playerIds.includes(player1Id) ? game.team1 : game.team2;
      const player2Team = game.team1.playerIds.includes(player1Id) ? game.team2 : game.team1;

      return {
        id: game.id,
        date: game.date,
        type: game.type,
        player1Score: player1Team.score,
        player2Score: player2Team.score,
        winner: player1Team.score > player2Team.score ? 'player1' as const : 'player2' as const,
        scoreDiff: Math.abs(player1Team.score - player2Team.score)
      };
    });

    h2hGames.forEach(game => {
      const p1Team = game.team1.playerIds.includes(player1Id) ? game.team1 : game.team2;
      const p2Team = game.team1.playerIds.includes(player1Id) ? game.team2 : game.team1;
      p1PointsFor += p1Team.score;
      p1PointsAgainst += p2Team.score;
    });

    return {
      totalGames: h2hGames.length,
      singles: h2hGames.filter(g => g.type === 'Singles').length,
      doubles: h2hGames.filter(g => g.type === 'Doubles').length,
      recentGames,
      p1PointsFor,
      p1PointsAgainst,
      averageScoreDiff: h2hGames.length > 0 ?
        h2hGames.reduce((sum, game) => {
          const p1Team = game.team1.playerIds.includes(player1Id) ? game.team1 : game.team2;
          const p2Team = game.team1.playerIds.includes(player1Id) ? game.team2 : game.team1;
          return sum + Math.abs(p1Team.score - p2Team.score);
        }, 0) / h2hGames.length : 0
    };
  }, [player1Id, player2Id, games, h2hStats]);

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">No Club Access</p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact an administrator to get access to a club.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Loading head-to-head data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <AlertCircle className="h-6 w-6 text-destructive mr-2" />
          <div>
            <p className="font-medium">Failed to load head-to-head data</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const player1 = players.find(p => p.id === player1Id);
  const player2 = players.find(p => p.id === player2Id);

  return (
    <div className="space-y-6">
      {/* Player Selection - Compact inline row */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Player 1</label>
              <Select value={player1Id} onValueChange={setPlayer1Id}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === player2Id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Player 2</label>
              <Select value={player2Id} onValueChange={setPlayer2Id}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === player1Id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {player1 && player2 && h2hStats && matchupAnalysis ? (
        matchupAnalysis.totalGames > 0 ? (
          <>
            {/* Series Record Card */}
            <Card>
              <CardContent className="pt-6">
                {(() => {
                  const p1Wins = h2hStats.player1Stats?.wins || 0;
                  const p2Wins = h2hStats.player2Stats?.wins || 0;
                  const p1Color = p1Wins > p2Wins ? 'text-green-600' : p1Wins < p2Wins ? 'text-red-600' : 'text-muted-foreground';
                  const p2Color = p2Wins > p1Wins ? 'text-green-600' : p2Wins < p1Wins ? 'text-red-600' : 'text-muted-foreground';
                  return (
                    <>
                      <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={player1.avatar} alt={player1.name} />
                            <AvatarFallback>{player1.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="text-right">
                            <div className="font-semibold text-sm sm:text-base">{player1.name}</div>
                          </div>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl sm:text-3xl font-bold ${p1Color}`}>
                            {p1Wins}
                          </span>
                          <span className="text-lg text-muted-foreground">-</span>
                          <span className={`text-2xl sm:text-3xl font-bold ${p2Color}`}>
                            {p2Wins}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="text-left">
                            <div className="font-semibold text-sm sm:text-base">{player2.name}</div>
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={player2.avatar} alt={player2.name} />
                            <AvatarFallback>{player2.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground border-t pt-4">
                        <span>{matchupAnalysis.totalGames} games</span>
                        {matchupAnalysis.singles > 0 && <span>{matchupAnalysis.singles} singles</span>}
                        {matchupAnalysis.doubles > 0 && <span>{matchupAnalysis.doubles} doubles</span>}
                        <span>Avg margin: {matchupAnalysis.averageScoreDiff.toFixed(1)}</span>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Combined Comparison */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comparison</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {(() => {
                  const p1H2HWins = h2hStats.player1Stats?.wins || 0;
                  const p2H2HWins = h2hStats.player2Stats?.wins || 0;
                  const p1H2HWinRate = matchupAnalysis.totalGames > 0 ? (p1H2HWins / matchupAnalysis.totalGames * 100) : 0;
                  const p2H2HWinRate = matchupAnalysis.totalGames > 0 ? (p2H2HWins / matchupAnalysis.totalGames * 100) : 0;
                  const p1H2HPointDiff = matchupAnalysis.p1PointsFor - matchupAnalysis.p1PointsAgainst;
                  const p2H2HPointDiff = matchupAnalysis.p1PointsAgainst - matchupAnalysis.p1PointsFor;
                  const p1OverallWinRate = player1.wins + player1.losses > 0
                    ? ((player1.wins / (player1.wins + player1.losses)) * 100) : 0;
                  const p2OverallWinRate = player2.wins + player2.losses > 0
                    ? ((player2.wins / (player2.wins + player2.losses)) * 100) : 0;
                  const p1OverallPointDiff = player1.pointsFor - player1.pointsAgainst;
                  const p2OverallPointDiff = player2.pointsFor - player2.pointsAgainst;

                  const highlightBetter = (v1: number, v2: number) => ({
                    left: v1 > v2 ? 'font-semibold text-green-600' : v1 < v2 ? 'text-muted-foreground' : 'font-medium',
                    right: v2 > v1 ? 'font-semibold text-green-600' : v2 < v1 ? 'text-muted-foreground' : 'font-medium',
                  });

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-[30%]">{player1.name}</TableHead>
                          <TableHead className="text-center w-[40%]"></TableHead>
                          <TableHead className="text-left w-[30%]">{player2.name}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Section: Direct Matchup */}
                        <TableRow className="border-b-0">
                          <TableCell colSpan={3} className="pb-1 pt-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct Matchup</span>
                          </TableCell>
                        </TableRow>
                        {(() => {
                          const h = highlightBetter(p1H2HWins, p2H2HWins);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>{p1H2HWins}</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">H2H Wins</TableCell>
                              <TableCell className={h.right}>{p2H2HWins}</TableCell>
                            </TableRow>
                          );
                        })()}
                        {(() => {
                          const h = highlightBetter(p1H2HWinRate, p2H2HWinRate);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>{p1H2HWinRate.toFixed(0)}%</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">H2H Win Rate</TableCell>
                              <TableCell className={h.right}>{p2H2HWinRate.toFixed(0)}%</TableCell>
                            </TableRow>
                          );
                        })()}
                        {(() => {
                          const h = highlightBetter(matchupAnalysis.p1PointsFor, matchupAnalysis.p1PointsAgainst);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>{matchupAnalysis.p1PointsFor}</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">H2H Points Scored</TableCell>
                              <TableCell className={h.right}>{matchupAnalysis.p1PointsAgainst}</TableCell>
                            </TableRow>
                          );
                        })()}
                        {(() => {
                          const h = highlightBetter(p1H2HPointDiff, p2H2HPointDiff);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>
                                {p1H2HPointDiff > 0 ? '+' : ''}{p1H2HPointDiff}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">H2H Point Diff</TableCell>
                              <TableCell className={h.right}>
                                {p2H2HPointDiff > 0 ? '+' : ''}{p2H2HPointDiff}
                              </TableCell>
                            </TableRow>
                          );
                        })()}

                        {/* Section: Overall */}
                        <TableRow className="border-b-0">
                          <TableCell colSpan={3} className="pb-1 pt-4">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall</span>
                          </TableCell>
                        </TableRow>
                        {(() => {
                          const h = highlightBetter(player1.rating, player2.rating);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>{player1.rating.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">Rating</TableCell>
                              <TableCell className={h.right}>{player2.rating.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })()}
                        {(() => {
                          const h = highlightBetter(player1.wins, player2.wins);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>{player1.wins}</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">Wins</TableCell>
                              <TableCell className={h.right}>{player2.wins}</TableCell>
                            </TableRow>
                          );
                        })()}
                        {(() => {
                          const h = highlightBetter(player2.losses, player1.losses);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>{player1.losses}</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">Losses</TableCell>
                              <TableCell className={h.right}>{player2.losses}</TableCell>
                            </TableRow>
                          );
                        })()}
                        {(() => {
                          const h = highlightBetter(p1OverallWinRate, p2OverallWinRate);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>{p1OverallWinRate.toFixed(0)}%</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">Win Rate</TableCell>
                              <TableCell className={h.right}>{p2OverallWinRate.toFixed(0)}%</TableCell>
                            </TableRow>
                          );
                        })()}
                        {(() => {
                          const h = highlightBetter(p1OverallPointDiff, p2OverallPointDiff);
                          return (
                            <TableRow>
                              <TableCell className={`text-right ${h.left}`}>
                                {p1OverallPointDiff > 0 ? '+' : ''}{p1OverallPointDiff}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">Point Diff</TableCell>
                              <TableCell className={h.right}>
                                {p2OverallPointDiff > 0 ? '+' : ''}{p2OverallPointDiff}
                              </TableCell>
                            </TableRow>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Recent Matchups */}
            {matchupAnalysis.recentGames.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Matchups</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Winner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchupAnalysis.recentGames.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell className="text-sm">
                            {new Date(game.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {game.player1Score} - {game.player2Score}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={game.winner === 'player1' ? 'default' : 'secondary'} className="text-xs">
                              {game.winner === 'player1' ? player1.name : player2.name}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Swords className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">No Direct Matches Found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {player1.name} and {player2.name} haven't played against each other yet.
              </p>
            </CardContent>
          </Card>
        )
      ) : !player1 || !player2 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Select Two Players</p>
            <p className="text-sm text-muted-foreground mt-1">
              Choose two players above to see their head-to-head analysis.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
