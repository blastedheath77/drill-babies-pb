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
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Swords, 
  Trophy, 
  BarChart, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowLeftRight,
  Percent
} from 'lucide-react';
import type { Player, Game } from '@/lib/types';
import { getHeadToHeadStats } from '@/lib/data';
import { usePartnershipsData } from '@/hooks/use-games';
import { useClub } from '@/contexts/club-context';
import { Loader2, AlertCircle } from 'lucide-react';

export function HeadToHeadClient() {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { games, players, isLoading, error } = usePartnershipsData(selectedClub?.id);
  const [player1Id, setPlayer1Id] = React.useState<string>('');
  const [player2Id, setPlayer2Id] = React.useState<string>('');
  const [comparisonMode, setComparisonMode] = React.useState<'head-to-head' | 'overall'>('head-to-head');

  // Calculate head-to-head stats - moved before early returns to prevent hook order issues
  const h2hStats = React.useMemo(() => {
    if (!player1Id || !player2Id || player1Id === player2Id || !games) return null;
    
    const stats1 = getHeadToHeadStats(player1Id, player2Id, games);
    const stats2 = getHeadToHeadStats(player2Id, player1Id, games);
    
    return {
      player1Stats: stats1,
      player2Stats: stats2
    };
  }, [player1Id, player2Id, games]);

  // Calculate detailed matchup analysis - moved before early returns to prevent hook order issues
  const matchupAnalysis = React.useMemo(() => {
    if (!player1Id || !player2Id || !h2hStats || !games) return null;

    const h2hGames = games.filter(game => 
      game.playerIds.includes(player1Id) && 
      game.playerIds.includes(player2Id)
    ).filter(game => {
      // Only games where they're on opposite teams
      const player1Team1 = game.team1.playerIds.includes(player1Id);
      const player2Team1 = game.team1.playerIds.includes(player2Id);
      return player1Team1 !== player2Team1;
    });

    const gameBreakdown = {
      singles: h2hGames.filter(g => g.type === 'Singles').length,
      doubles: h2hGames.filter(g => g.type === 'Doubles').length,
    };

    const recentGames = h2hGames.slice(0, 10).map(game => {
      const player1Team = game.team1.playerIds.includes(player1Id) ? game.team1 : game.team2;
      const player2Team = game.team1.playerIds.includes(player1Id) ? game.team2 : game.team1;
      
      return {
        id: game.id,
        date: game.date,
        type: game.type,
        player1Score: player1Team.score,
        player2Score: player2Team.score,
        winner: player1Team.score > player2Team.score ? 'player1' : 'player2',
        scoreDiff: Math.abs(player1Team.score - player2Team.score)
      };
    });

    return {
      totalGames: h2hGames.length,
      gameBreakdown,
      recentGames,
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
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Users className="h-6 w-6" />
                No Club Access
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                You are not assigned to any clubs yet. Please contact an administrator to get access to a club.
              </p>
              <p className="text-sm text-muted-foreground">
                Once you have club access, you'll be able to analyze head-to-head matchups.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading head-to-head data...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <AlertCircle className="h-8 w-8 text-destructive mr-2" />
            <div>
              <p className="font-medium">Failed to load head-to-head data</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const player1 = players.find(p => p.id === player1Id);
  const player2 = players.find(p => p.id === player2Id);

  const handleSwapPlayers = () => {
    const temp = player1Id;
    setPlayer1Id(player2Id);
    setPlayer2Id(temp);
  };

  return (
    <div className="space-y-8">
        {/* Player Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Players to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Player 1</label>
                <Select value={player1Id} onValueChange={setPlayer1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select first player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id} disabled={p.id === player2Id}>
                        {p.name} (Rating: {p.rating.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwapPlayers}
                  disabled={!player1Id || !player2Id}
                  className="mb-2"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Player 2</label>
                <Select value={player2Id} onValueChange={setPlayer2Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select second player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id} disabled={p.id === player1Id}>
                        {p.name} (Rating: {p.rating.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {player1 && player2 && (
          <>
            {/* Player Profiles Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[player1, player2].map((player, index) => (
                <Card key={player.id} className={`border-2 ${index === 0 ? 'border-blue-200' : 'border-red-200'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={player.avatar} alt={player.name} />
                        <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold">{player.name}</h3>
                        <p className="text-muted-foreground">Rating: {player.rating.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-secondary/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{player.wins}</div>
                        <div className="text-xs text-muted-foreground">Total Wins</div>
                      </div>
                      <div className="text-center p-3 bg-secondary/20 rounded-lg">
                        <div className="text-lg font-bold text-red-600">{player.losses}</div>
                        <div className="text-xs text-muted-foreground">Total Losses</div>
                      </div>
                      <div className="text-center p-3 bg-secondary/20 rounded-lg">
                        <div className="text-lg font-bold">
                          {player.wins + player.losses > 0 ? 
                            ((player.wins / (player.wins + player.losses)) * 100).toFixed(0) : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="text-center p-3 bg-secondary/20 rounded-lg">
                        <div className="text-lg font-bold">
                          {player.pointsFor - player.pointsAgainst > 0 ? '+' : ''}{player.pointsFor - player.pointsAgainst}
                        </div>
                        <div className="text-xs text-muted-foreground">Point Diff</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Head-to-Head Stats */}
            {h2hStats && matchupAnalysis && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Swords className="h-5 w-5" />
                      Direct Matchup History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {matchupAnalysis.totalGames > 0 ? (
                      <div className="space-y-6">
                        {/* Overall H2H Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <StatCard
                            title="Total Games"
                            value={String(matchupAnalysis.totalGames)}
                            icon={<Swords className="h-4 w-4" />}
                          />
                          <StatCard
                            title={`${player1.name} Wins`}
                            value={String(h2hStats.player1Stats?.wins || 0)}
                            icon={<Trophy className="h-4 w-4" />}
                          />
                          <StatCard
                            title={`${player2.name} Wins`}
                            value={String(h2hStats.player2Stats?.wins || 0)}
                            icon={<Trophy className="h-4 w-4" />}
                          />
                          <StatCard
                            title="Avg Score Diff"
                            value={matchupAnalysis.averageScoreDiff.toFixed(1)}
                            icon={<BarChart className="h-4 w-4" />}
                          />
                        </div>

                        {/* Series Summary */}
                        <div className="flex items-center justify-center">
                          <div className="bg-primary/5 rounded-lg p-6 border-2 border-primary/20">
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground mb-2">Series Record</div>
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {h2hStats.player1Stats?.wins || 0}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{player1.name}</div>
                                </div>
                                <div className="text-2xl font-bold text-muted-foreground">-</div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-red-600">
                                    {h2hStats.player2Stats?.wins || 0}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{player2.name}</div>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                {h2hStats.player1Stats && h2hStats.player1Stats.wins > (h2hStats.player2Stats?.wins || 0) ? 
                                  `${player1.name} leads` : 
                                  h2hStats.player2Stats && h2hStats.player2Stats.wins > (h2hStats.player1Stats?.wins || 0) ?
                                  `${player2.name} leads` : 
                                  'Series tied'
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Game Type Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle>Game Type Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                  <span className="font-medium text-blue-800">Singles Games</span>
                                  <span className="font-bold text-blue-700">
                                    {matchupAnalysis.gameBreakdown.singles}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                  <span className="font-medium text-purple-800">Doubles Games</span>
                                  <span className="font-bold text-purple-700">
                                    {matchupAnalysis.gameBreakdown.doubles}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>Matchup Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                  <span className="font-medium text-green-800">Competitiveness</span>
                                  <span className="font-bold text-green-700">
                                    {matchupAnalysis.averageScoreDiff < 3 ? 'Very Close' :
                                     matchupAnalysis.averageScoreDiff < 5 ? 'Competitive' :
                                     matchupAnalysis.averageScoreDiff < 7 ? 'Moderate' : 'One-sided'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                  <span className="font-medium text-orange-800">Sample Size</span>
                                  <span className="font-bold text-orange-700">
                                    {matchupAnalysis.totalGames >= 10 ? 'Large' :
                                     matchupAnalysis.totalGames >= 5 ? 'Moderate' :
                                     matchupAnalysis.totalGames >= 3 ? 'Small' : 'Very Small'}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Recent Games */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Recent Matchups</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead className="text-center">Score</TableHead>
                                  <TableHead className="text-center">Winner</TableHead>
                                  <TableHead className="text-center">Margin</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {matchupAnalysis.recentGames.map((game) => (
                                  <TableRow key={game.id}>
                                    <TableCell>{new Date(game.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{game.type}</TableCell>
                                    <TableCell className="text-center font-mono">
                                      {game.player1Score} - {game.player2Score}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant={game.winner === 'player1' ? 'default' : 'secondary'}>
                                        {game.winner === 'player1' ? player1.name : player2.name}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                      {game.scoreDiff}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Direct Matches Found</h3>
                        <p className="text-muted-foreground">
                          {player1.name} and {player2.name} haven't played against each other yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!player1 || !player2 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Select Two Players to Compare</h3>
                <p className="text-muted-foreground">
                  Choose any two players from the dropdown menus above to see their head-to-head analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
    </div>
  );
}