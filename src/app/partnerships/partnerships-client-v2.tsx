'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Users, Swords, Trophy, TrendingUp } from 'lucide-react';
import type { Player, Partnership } from '@/lib/types';
import Link from 'next/link';
import { usePartnershipsData } from '@/hooks/use-games';
import { useClub } from '@/contexts/club-context';
import { getPartnershipStats } from '@/lib/data';
import { Loader2, AlertCircle } from 'lucide-react';

interface PartnershipData {
  player: Player;
  partnerships: Partnership[];
  totalGames: number;
  averageWinRate: number;
}

interface BestPartnership extends Partnership {
  playerName: string;
}

export function PartnershipsClientV2() {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { games, players, isLoading, error } = usePartnershipsData(selectedClub?.id);

  // Calculate partnerships - always call useMemo hooks
  const allPartnerships: PartnershipData[] = React.useMemo(() => {
    if (!games || !players || games.length === 0 || players.length === 0) {
      return [];
    }

    try {
      return players.map((player) => {
        const partnerships = getPartnershipStats(player.id, games, players);
        // Only count partnerships where games were actually played together
        const validPartnerships = partnerships.filter(p => p.partner && p.gamesPlayed > 0);
        
        // Calculate total partnership games for this player (only doubles games where they participated)
        const playerDoublesGames = games.filter(game => 
          game.type === 'Doubles' && 
          (game.team1.playerIds.includes(player.id) || game.team2.playerIds.includes(player.id))
        );
        
        
        return {
          player,
          partnerships: validPartnerships,
          totalGames: playerDoublesGames.length, // Actual number of doubles games this player played
          averageWinRate: validPartnerships.length > 0 
            ? validPartnerships.reduce((sum, p) => sum + (p.gamesPlayed > 0 ? p.wins / p.gamesPlayed : 0), 0) / validPartnerships.length * 100
            : 0
        };
      }).filter(p => p.partnerships.length > 0);
    } catch (error) {
      console.error('Error calculating partnerships:', error);
      return [];
    }
  }, [games, players]);

  // Calculate best partnerships - always call useMemo hooks
  const bestPartnerships: BestPartnership[] = React.useMemo(() => {
    try {
      const allBestPartnerships: BestPartnership[] = [];
      const seenPartnerships = new Set<string>();
      
      allPartnerships.forEach(playerData => {
        playerData.partnerships
          .filter(p => p.gamesPlayed >= 3) // Minimum 3 games
          .forEach(partnership => {
            // Create a unique key for this partnership (sorted alphabetically to avoid duplicates)
            const partnershipKey = [playerData.player.name, partnership.partner.name]
              .sort()
              .join('|');
            
            // Only add if we haven't seen this partnership before
            if (!seenPartnerships.has(partnershipKey)) {
              seenPartnerships.add(partnershipKey);
              allBestPartnerships.push({
                ...partnership,
                playerName: playerData.player.name
              });
            }
          });
      });

      return allBestPartnerships
        .sort((a, b) => {
          const aWinRate = a.gamesPlayed > 0 ? (a.wins / a.gamesPlayed) : 0;
          const bWinRate = b.gamesPlayed > 0 ? (b.wins / b.gamesPlayed) : 0;
          return bWinRate - aWinRate;
        })
        .slice(0, 10); // Top 10
    } catch (error) {
      console.error('Error calculating best partnerships:', error);
      return [];
    }
  }, [allPartnerships]);

  // Calculate global stats - always call useMemo hooks
  const globalStats = React.useMemo(() => {
    try {
      if (allPartnerships.length === 0) {
        return { totalPartnerships: 0, totalGames: 0, avgWinRate: 0, qualifiedPairs: 0 };
      }

      const totalPartnerships = allPartnerships.reduce((sum, p) => sum + p.partnerships.length, 0);
      const totalGames = allPartnerships.reduce((sum, p) => sum + p.totalGames, 0);
      const avgWinRate = allPartnerships.reduce((sum, p) => sum + p.averageWinRate, 0) / allPartnerships.length;
      const qualifiedPairs = bestPartnerships.length;

      return { totalPartnerships, totalGames, avgWinRate, qualifiedPairs };
    } catch (error) {
      console.error('Error calculating global stats:', error);
      return { totalPartnerships: 0, totalGames: 0, avgWinRate: 0, qualifiedPairs: 0 };
    }
  }, [allPartnerships, bestPartnerships]);

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Partnership Analysis"
          description="Comprehensive analysis of doubles partnerships across all players."
        />
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
                Once you have club access, you'll be able to view partnership analysis.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Partnership Analysis"
          description="Comprehensive analysis of doubles partnerships across all players."
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading partnership data...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Partnership Analysis"
          description="Comprehensive analysis of doubles partnerships across all players."
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <AlertCircle className="h-8 w-8 text-destructive mr-2" />
            <div>
              <p className="font-medium">Failed to load partnership data</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render empty state
  if (allPartnerships.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Partnership Analysis"
          description="Comprehensive analysis of doubles partnerships across all players."
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No partnership data available. Play some doubles games to see partnerships!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partnership Analysis"
        description="Comprehensive analysis of doubles partnerships across all players."
      />


      {/* Best Partnerships */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Partnerships</CardTitle>
          <p className="text-sm text-muted-foreground">
            Partnerships with the highest win rates (minimum 3 games)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bestPartnerships.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No partnerships with 3+ games found yet.
              </p>
            ) : (
              bestPartnerships.map((partnership, index) => {
              const winRate = partnership.gamesPlayed > 0 ? (partnership.wins / partnership.gamesPlayed) * 100 : 0;
              
              return (
                <div
                  key={`${partnership.playerName}-${partnership.partner.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-accent transition-colors space-y-2 sm:space-y-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {partnership.playerName} & {partnership.partner.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {partnership.gamesPlayed} games played
                      </div>
                    </div>
                  </div>
                  <div className="text-right sm:text-right text-left">
                    <div className="text-xl font-bold text-primary">
                      {winRate.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {partnership.wins}-{partnership.losses} record
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </CardContent>
      </Card>

      {/* Player Partnership Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Player Partnership Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Partnership performance summary for each player
          </p>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Partners</TableHead>
                  <TableHead className="text-center">Total Games</TableHead>
                  <TableHead className="text-center">Avg Win Rate</TableHead>
                  <TableHead className="text-center">Best Partner</TableHead>
                  <TableHead className="text-center">Chemistry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPartnerships
                  .sort((a, b) => b.averageWinRate - a.averageWinRate)
                  .map((playerData) => {
                    // Filter partnerships with at least 3 games for "Best Partner" calculation
                    const qualifiedPartnerships = playerData.partnerships.filter(p => p.gamesPlayed >= 3);
                    const bestPartnership = qualifiedPartnerships.length > 0 
                      ? qualifiedPartnerships.reduce((best, current) => {
                          const currentWinRate = current.gamesPlayed > 0 ? current.wins / current.gamesPlayed : 0;
                          const bestWinRate = best.gamesPlayed > 0 ? best.wins / best.gamesPlayed : 0;
                          
                          if (Math.abs(currentWinRate - bestWinRate) < 0.1) {
                            return current.gamesPlayed > best.gamesPlayed ? current : best;
                          }
                          return currentWinRate > bestWinRate ? current : best;
                        }, qualifiedPartnerships[0])
                      : null;

                    const getChemistryRating = () => {
                      if (playerData.averageWinRate >= 70) return { label: "Excellent", color: "text-green-600" };
                      if (playerData.averageWinRate >= 60) return { label: "Very Good", color: "text-green-500" };
                      if (playerData.averageWinRate >= 50) return { label: "Good", color: "text-yellow-600" };
                      if (playerData.averageWinRate >= 40) return { label: "Fair", color: "text-orange-600" };
                      return { label: "Poor", color: "text-red-600" };
                    };

                    const chemistry = getChemistryRating();

                    return (
                      <TableRow key={playerData.player.id}>
                        <TableCell>
                          <Link href={`/players/${playerData.player.id}`}>
                            <div className="flex items-center gap-3 hover:underline cursor-pointer">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={playerData.player.avatar}
                                  alt={playerData.player.name}
                                />
                                <AvatarFallback>
                                  {playerData.player.name.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{playerData.player.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Rating: {playerData.player.rating.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {playerData.partnerships.length}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {playerData.totalGames}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${
                            playerData.averageWinRate >= 70 ? 'text-green-600' :
                            playerData.averageWinRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {playerData.averageWinRate.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {bestPartnership ? (
                            <div className="flex items-center justify-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={bestPartnership.partner.avatar}
                                  alt={bestPartnership.partner.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {bestPartnership.partner.name.substring(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {bestPartnership.partner.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No qualified partners</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={
                            chemistry.label === 'Excellent' || chemistry.label === 'Very Good' ? 'default' :
                            chemistry.label === 'Good' ? 'secondary' : 'destructive'
                          }>
                            {chemistry.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {allPartnerships
              .sort((a, b) => b.averageWinRate - a.averageWinRate)
              .map((playerData) => {
                // Filter partnerships with at least 3 games for "Best Partner" calculation
                const qualifiedPartnerships = playerData.partnerships.filter(p => p.gamesPlayed >= 3);
                const bestPartnership = qualifiedPartnerships.length > 0 
                  ? qualifiedPartnerships.reduce((best, current) => {
                      const currentWinRate = current.gamesPlayed > 0 ? current.wins / current.gamesPlayed : 0;
                      const bestWinRate = best.gamesPlayed > 0 ? best.wins / best.gamesPlayed : 0;
                      
                      if (Math.abs(currentWinRate - bestWinRate) < 0.1) {
                        return current.gamesPlayed > best.gamesPlayed ? current : best;
                      }
                      return currentWinRate > bestWinRate ? current : best;
                    }, qualifiedPartnerships[0])
                  : null;

                const getChemistryRating = () => {
                  if (playerData.averageWinRate >= 70) return { label: "Excellent", color: "text-green-600" };
                  if (playerData.averageWinRate >= 60) return { label: "Very Good", color: "text-green-500" };
                  if (playerData.averageWinRate >= 50) return { label: "Good", color: "text-yellow-600" };
                  if (playerData.averageWinRate >= 40) return { label: "Fair", color: "text-orange-600" };
                  return { label: "Poor", color: "text-red-600" };
                };

                const chemistry = getChemistryRating();

                return (
                  <div key={playerData.player.id} className="border rounded-lg p-4 space-y-3">
                    {/* Player Info */}
                    <Link href={`/players/${playerData.player.id}`}>
                      <div className="flex items-center gap-3 hover:underline cursor-pointer">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={playerData.player.avatar}
                            alt={playerData.player.name}
                          />
                          <AvatarFallback>
                            {playerData.player.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{playerData.player.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Rating: {playerData.player.rating.toFixed(2)}
                          </div>
                        </div>
                        <Badge variant={
                          chemistry.label === 'Excellent' || chemistry.label === 'Very Good' ? 'default' :
                          chemistry.label === 'Good' ? 'secondary' : 'destructive'
                        }>
                          {chemistry.label}
                        </Badge>
                      </div>
                    </Link>

                    {/* Condensed Stats Row */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">{playerData.partnerships.length}</div>
                        <div className="text-xs text-muted-foreground">Partners</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">{playerData.totalGames}</div>
                        <div className="text-xs text-muted-foreground">Total Games</div>
                      </div>
                      <div className="text-center">
                        <span className={`text-xl font-bold ${
                          playerData.averageWinRate >= 70 ? 'text-green-600' :
                          playerData.averageWinRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {playerData.averageWinRate.toFixed(0)}%
                        </span>
                        <div className="text-xs text-muted-foreground">Avg Win Rate</div>
                      </div>
                    </div>

                    {/* Best Partner */}
                    <div className="border-t pt-3">
                      <div className="text-sm text-muted-foreground mb-1">Best Partner</div>
                      {bestPartnership ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={bestPartnership.partner.avatar}
                              alt={bestPartnership.partner.name}
                            />
                            <AvatarFallback className="text-xs">
                              {bestPartnership.partner.name.substring(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{bestPartnership.partner.name}</span>
                          <span className="text-sm text-muted-foreground ml-auto">
                            {bestPartnership.gamesPlayed} games, {((bestPartnership.wins / bestPartnership.gamesPlayed) * 100).toFixed(0)}% wins
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No qualified partners</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}