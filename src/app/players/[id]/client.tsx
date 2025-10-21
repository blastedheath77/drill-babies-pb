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
import { TabsContent } from '@/components/ui/tabs';
import type { Game, HeadToHead, Player, Partnership } from '@/lib/types';
import { getHeadToHeadStats, getBiggestRivals } from '@/lib/data';
import { BarChart, Percent, Swords, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeadToHeadClientProps {
  playerId: string;
  initialData: HeadToHead | null;
  allPlayers: Player[];
  games: Game[];
}

export function HeadToHeadClient({
  playerId,
  initialData,
  allPlayers,
  games,
}: HeadToHeadClientProps) {
  const [selectedOpponentId, setSelectedOpponentId] = React.useState<string | undefined>(
    initialData?.opponentId
  );
  const [headToHeadData, setHeadToHeadData] = React.useState<HeadToHead | null>(initialData);

  // Calculate biggest rivals
  const biggestRivals = React.useMemo(() => {
    return getBiggestRivals(playerId, allPlayers, games);
  }, [playerId, allPlayers, games]);

  // Calculate detailed head-to-head analysis
  const detailedAnalysis = React.useMemo(() => {
    if (!selectedOpponentId || !headToHeadData) return null;

    const h2hGames = games.filter(game => {
      return game.playerIds.includes(selectedOpponentId) && game.playerIds.includes(playerId);
    }).filter(game => {
      // Only games where they're on opposite teams
      const playerTeam1 = game.team1.playerIds.includes(playerId);
      const opponentTeam1 = game.team1.playerIds.includes(selectedOpponentId);
      return playerTeam1 !== opponentTeam1;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by most recent first

    const recentForm = h2hGames.slice(0, 5).map(game => {
      const playerTeam = game.team1.playerIds.includes(playerId) ? game.team1 : game.team2;
      const opponentTeam = game.team1.playerIds.includes(playerId) ? game.team2 : game.team1;
      return {
        gameId: game.id,
        date: game.date,
        result: playerTeam.score > opponentTeam.score ? 'W' : 'L',
        playerScore: playerTeam.score,
        opponentScore: opponentTeam.score,
        gameType: game.type,
      };
    });

    // Calculate streaks properly - current streak from most recent games
    const streaks = {
      current: 0,
      longest: 0,
      type: 'none' as 'win' | 'loss' | 'none'
    };

    if (h2hGames.length > 0) {
      // Calculate current streak starting from most recent game
      let currentStreak = 1;
      const mostRecentResult = h2hGames[0];
      const playerTeam = mostRecentResult.team1.playerIds.includes(playerId) ? mostRecentResult.team1 : mostRecentResult.team2;
      const opponentTeam = mostRecentResult.team1.playerIds.includes(playerId) ? mostRecentResult.team2 : mostRecentResult.team1;
      const currentType = playerTeam.score > opponentTeam.score ? 'win' : 'loss';

      // Count consecutive games with same result from most recent
      for (let i = 1; i < h2hGames.length; i++) {
        const game = h2hGames[i];
        const pTeam = game.team1.playerIds.includes(playerId) ? game.team1 : game.team2;
        const oTeam = game.team1.playerIds.includes(playerId) ? game.team2 : game.team1;
        const gameResult = pTeam.score > oTeam.score ? 'win' : 'loss';
        
        if (gameResult === currentType) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate longest streak in all h2h games
      let longestStreak = 1;
      let tempStreak = 1;
      let tempType = currentType;

      for (let i = 1; i < h2hGames.length; i++) {
        const game = h2hGames[i];
        const pTeam = game.team1.playerIds.includes(playerId) ? game.team1 : game.team2;
        const oTeam = game.team1.playerIds.includes(playerId) ? game.team2 : game.team1;
        const gameResult = pTeam.score > oTeam.score ? 'win' : 'loss';
        
        if (gameResult === tempType) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
          tempType = gameResult;
        }
      }

      streaks.current = currentStreak;
      streaks.longest = longestStreak;
      streaks.type = currentType;
    }

    return {
      recentForm,
      streaks,
      totalMatches: h2hGames.length,
      averageScoreDiff: headToHeadData.gamesPlayed > 0 ? headToHeadData.pointsDifference / headToHeadData.gamesPlayed : 0
    };
  }, [selectedOpponentId, headToHeadData, games, playerId]);

  React.useEffect(() => {
    if (selectedOpponentId) {
      const newStats = getHeadToHeadStats(playerId, selectedOpponentId, games);
      const opponent = allPlayers.find((p) => p.id === selectedOpponentId);
      if (newStats) {
        setHeadToHeadData({ ...newStats, opponent });
      }
    }
  }, [selectedOpponentId, playerId, games, allPlayers]);

  const handleOpponentChange = (opponentId: string) => {
    setSelectedOpponentId(opponentId);
  };

  return (
    <TabsContent value="h2h" className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Head-to-Head Analysis</CardTitle>
          <div className="pt-4">
            <Select value={selectedOpponentId} onValueChange={handleOpponentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select opponent" />
              </SelectTrigger>
              <SelectContent>
                {allPlayers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {headToHeadData && headToHeadData.opponent ? (
            <div className="space-y-6">
              {/* Opponent Info */}
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-3 border-2 border-primary/20">
                  <AvatarImage
                    src={headToHeadData.opponent.avatar}
                    alt={headToHeadData.opponent.name}
                    data-ai-hint="player avatar"
                  />
                  <AvatarFallback>{headToHeadData.opponent.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{headToHeadData.opponent.name}</h3>
                <p className="text-muted-foreground">Rating: {headToHeadData.opponent.rating.toFixed(2)}</p>
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Games Played"
                  value={String(headToHeadData.gamesPlayed)}
                  icon={<Swords className="h-4 w-4" />}
                />
                <StatCard
                  title="Record (W-L)"
                  value={`${headToHeadData.wins}-${headToHeadData.losses}`}
                  icon={<Users className="h-4 w-4" />}
                />
                <StatCard
                  title="Win %"
                  value={`${
                    headToHeadData.gamesPlayed > 0
                      ? ((headToHeadData.wins / headToHeadData.gamesPlayed) * 100).toFixed(0)
                      : 0
                  }%`}
                  icon={<Percent className="h-4 w-4" />}
                />
                <StatCard
                  title="Points Diff"
                  value={String(headToHeadData.pointsDifference)}
                  icon={<BarChart className="h-4 w-4" />}
                />
              </div>

              {/* Detailed Analysis */}
              {detailedAnalysis && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Form (Last 5 Games)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detailedAnalysis.recentForm.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            {detailedAnalysis.recentForm.map((game, index) => (
                              <div
                                key={game.gameId}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  game.result === 'W' ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                title={`${game.gameType} - ${game.playerScore} vs ${game.opponentScore} (${new Date(game.date).toLocaleDateString()})`}
                              >
                                {game.result}
                              </div>
                            ))}
                          </div>
                          
                          <div className="space-y-2">
                            {detailedAnalysis.recentForm.map((game) => (
                              <div key={game.gameId} className="flex items-center justify-between text-sm p-2 bg-secondary/30 rounded">
                                <span className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    game.result === 'W' ? 'bg-green-500' : 'bg-red-500'
                                  }`} />
                                  {game.gameType}
                                </span>
                                <span className="font-mono">
                                  {game.playerScore} - {game.opponentScore}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(game.date).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No recent games found
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Performance Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium text-blue-800">Current Streak</span>
                          <span className={`font-bold ${
                            detailedAnalysis.streaks.type === 'win' ? 'text-green-600' : 
                            detailedAnalysis.streaks.type === 'loss' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {detailedAnalysis.streaks.current > 0 && detailedAnalysis.streaks.type !== 'none' ? (
                              `${detailedAnalysis.streaks.current} ${detailedAnalysis.streaks.type === 'win' ? 'W' : 'L'}`
                            ) : (
                              'N/A'
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <span className="font-medium text-purple-800">Avg Score Difference</span>
                          <span className={`font-bold font-mono ${
                            detailedAnalysis.averageScoreDiff > 0 ? 'text-green-600' : 
                            detailedAnalysis.averageScoreDiff < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {detailedAnalysis.averageScoreDiff > 0 ? '+' : ''}{detailedAnalysis.averageScoreDiff.toFixed(1)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                          <span className="font-medium text-amber-800">Dominance Level</span>
                          <span className="font-bold">
                            {(() => {
                              const winRate = headToHeadData.gamesPlayed > 0 ? 
                                (headToHeadData.wins / headToHeadData.gamesPlayed) : 0;
                              if (winRate >= 0.75) return <span className="text-green-600">Dominant</span>;
                              if (winRate >= 0.6) return <span className="text-green-500">Strong</span>;
                              if (winRate >= 0.4) return <span className="text-yellow-600">Competitive</span>;
                              return <span className="text-red-600">Struggling</span>;
                            })()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-800">Matchup Familiarity</span>
                          <span className="font-bold text-green-700">
                            {headToHeadData.gamesPlayed >= 10 ? 'High' :
                             headToHeadData.gamesPlayed >= 5 ? 'Medium' :
                             headToHeadData.gamesPlayed >= 2 ? 'Low' : 'Very Low'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select an opponent to see detailed head-to-head analysis</p>
              <p className="text-sm">Choose from {allPlayers.length} available opponents</p>
            </div>
          )}
        </CardContent>
      </Card>

      {biggestRivals.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Biggest Rivals</CardTitle>
            <p className="text-sm text-muted-foreground">
              Players with your worst win rates (minimum 2 games)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {biggestRivals.map((rival: any, index: number) => (
                <div
                  key={rival.opponent.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => setSelectedOpponentId(rival.opponent.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                      {index + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={rival.opponent.avatar}
                        alt={rival.opponent.name}
                        data-ai-hint="player avatar"
                      />
                      <AvatarFallback>{rival.opponent.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{rival.opponent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {rival.gamesPlayed} games played
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      {((rival.winRate || 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rival.wins}-{rival.losses}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

interface PartnershipClientProps {
  partnerships: Partnership[];
}

export function PartnershipClient({ partnerships }: PartnershipClientProps) {
  const [selectedPartner, setSelectedPartner] = React.useState<Partnership | null>(
    partnerships[0] || null
  );

  // Calculate partnership insights
  const partnershipInsights = React.useMemo(() => {
    if (partnerships.length === 0) return { bestPartner: null, totalGames: 0, averageWinRate: 0 };

    const totalGames = partnerships.reduce((sum, p) => sum + p.gamesPlayed, 0);
    // Filter partnerships with at least 3 games for "Best Partner" calculation
    const qualifiedPartnerships = partnerships.filter(p => p.gamesPlayed >= 3);
    const bestPartner = qualifiedPartnerships.length > 0 
      ? qualifiedPartnerships.reduce((best, current) => {
          const currentWinRate = current.gamesPlayed > 0 ? current.wins / current.gamesPlayed : 0;
          const bestWinRate = best.gamesPlayed > 0 ? best.wins / best.gamesPlayed : 0;
          
          // Prioritize partners with more games if win rates are close
          if (Math.abs(currentWinRate - bestWinRate) < 0.1) {
            return current.gamesPlayed > best.gamesPlayed ? current : best;
          }
          return currentWinRate > bestWinRate ? current : best;
        }, qualifiedPartnerships[0])
      : null;

    const totalWins = partnerships.reduce((sum, p) => sum + p.wins, 0);
    const averageWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    return { bestPartner, totalGames, averageWinRate };
  }, [partnerships]);

  return (
    <TabsContent value="partners" className="mt-4 space-y-6">
      {/* Best Partner Highlight */}
      {partnershipInsights.bestPartner && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                ★
              </div>
              Best Partnership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage
                    src={partnershipInsights.bestPartner.partner.avatar}
                    alt={partnershipInsights.bestPartner.partner.name}
                  />
                  <AvatarFallback>
                    {partnershipInsights.bestPartner.partner.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-lg">
                    {partnershipInsights.bestPartner.partner.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {partnershipInsights.bestPartner.gamesPlayed} games together
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {partnershipInsights.bestPartner.gamesPlayed > 0
                    ? ((partnershipInsights.bestPartner.wins / partnershipInsights.bestPartner.gamesPlayed) * 100).toFixed(0)
                    : 0}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {partnershipInsights.bestPartner.wins}-{partnershipInsights.bestPartner.losses} record
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partnership Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partnership List */}
        <Card>
          <CardHeader>
            <CardTitle>All Partnerships</CardTitle>
            <p className="text-sm text-muted-foreground">
              Partnerships with 3+ games, sorted by win rate. Click to see detailed stats.
            </p>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {partnerships
                .filter(p => p.gamesPlayed >= 3) // Only show partnerships with 3+ games
                .sort((a, b) => {
                  // Sort by win rate (descending)
                  const aWinRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
                  const bWinRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
                  return bWinRate - aWinRate;
                })
                .map((p) => {
                const winRate = p.gamesPlayed > 0 ? (p.wins / p.gamesPlayed) * 100 : 0;
                const isSelected = selectedPartner?.partner.id === p.partner.id;
                
                return (
                  <div
                    key={p.partner.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => setSelectedPartner(p)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={p.partner.avatar}
                          alt={p.partner.name}
                        />
                        <AvatarFallback>{p.partner.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{p.partner.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.gamesPlayed} games
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        winRate >= 70 ? 'text-green-600' : 
                        winRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {winRate.toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.wins}-{p.losses}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Partner Details */}
        <Card>
          <CardHeader>
            <CardTitle>Partnership Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPartner ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={selectedPartner.partner.avatar}
                      alt={selectedPartner.partner.name}
                    />
                    <AvatarFallback>
                      {selectedPartner.partner.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedPartner.partner.name}</h3>
                    <p className="text-muted-foreground">
                      Rating: {selectedPartner.partner.rating.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold">{selectedPartner.gamesPlayed}</div>
                    <div className="text-sm text-muted-foreground">Games Together</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedPartner.wins}</div>
                    <div className="text-sm text-muted-foreground">Wins</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{selectedPartner.losses}</div>
                    <div className="text-sm text-muted-foreground">Losses</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <div className={`text-2xl font-bold ${
                      selectedPartner.gamesPlayed > 0 && 
                      (selectedPartner.wins / selectedPartner.gamesPlayed) >= 0.7 
                        ? 'text-green-600' 
                        : selectedPartner.gamesPlayed > 0 && 
                          (selectedPartner.wins / selectedPartner.gamesPlayed) >= 0.5 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                    }`}>
                      {selectedPartner.gamesPlayed > 0 
                        ? ((selectedPartner.wins / selectedPartner.gamesPlayed) * 100).toFixed(0)
                        : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                </div>

                {/* Partnership Analysis */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Partnership Analysis</h4>
                  <div className="space-y-2 text-sm">
                    {selectedPartner.gamesPlayed >= 5 && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 text-blue-900 rounded">
                        <span>Partnership Status:</span>
                        <span className="font-medium">
                          {selectedPartner.gamesPlayed > 0 &&
                           (selectedPartner.wins / selectedPartner.gamesPlayed) >= 0.7
                            ? "Excellent Chemistry"
                            : selectedPartner.gamesPlayed > 0 &&
                              (selectedPartner.wins / selectedPartner.gamesPlayed) >= 0.5
                                ? "Good Partnership"
                                : "Needs Work"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-2 bg-gray-50 text-gray-900 rounded">
                      <span>Games Needed for Ranking:</span>
                      <span className="font-medium">
                        {Math.max(0, 10 - selectedPartner.gamesPlayed)} more
                      </span>
                    </div>
                    {selectedPartner.gamesPlayed > 0 && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 text-gray-900 rounded">
                        <span>Recent Form:</span>
                        <span className="font-medium">
                          {selectedPartner.wins > selectedPartner.losses ? "Strong" :
                           selectedPartner.wins === selectedPartner.losses ? "Balanced" : "Struggling"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a partner from the list to see detailed statistics
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Partnership Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partnership Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-center">Games</TableHead>
                <TableHead className="text-center">Record</TableHead>
                <TableHead className="text-center">Win %</TableHead>
                <TableHead className="text-center">Chemistry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerships
                .filter(p => p.gamesPlayed >= 3) // Only show partnerships with 3+ games
                .sort((a, b) => {
                  // Sort by win rate (descending)
                  const aWinRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
                  const bWinRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
                  return bWinRate - aWinRate;
                })
                .map((p) => {
                const winRate = p.gamesPlayed > 0 ? (p.wins / p.gamesPlayed) * 100 : 0;
                const getChemistryLevel = () => {
                  if (p.gamesPlayed < 3) return { label: "New", color: "text-gray-500" };
                  if (winRate >= 70) return { label: "Excellent", color: "text-green-600" };
                  if (winRate >= 50) return { label: "Good", color: "text-yellow-600" };
                  return { label: "Poor", color: "text-red-600" };
                };
                const chemistry = getChemistryLevel();

                return (
                  <TableRow key={p.partner.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={p.partner.avatar}
                            alt={p.partner.name}
                          />
                          <AvatarFallback>{p.partner.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.partner.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{p.partner.rating.toFixed(2)}</span>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {p.gamesPlayed}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.wins}-{p.losses}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${
                        winRate >= 70 ? 'text-green-600' : 
                        winRate >= 50 ? 'text-yellow-600' : 
                        winRate > 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {winRate.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${chemistry.color}`}>
                        {chemistry.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
