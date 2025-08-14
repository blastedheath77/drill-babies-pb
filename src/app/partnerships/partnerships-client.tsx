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
import { getPartnershipStats } from '@/lib/data';
import { Loader2, AlertCircle } from 'lucide-react';

interface PartnershipData {
  player: Player;
  partnerships: Partnership[];
  totalGames: number;
  averageWinRate: number;
}

export function PartnershipsClient() {
  const { games, players, isLoading, error } = usePartnershipsData();

  // Calculate all partnerships from fresh data
  const allPartnerships = React.useMemo((): PartnershipData[] => {
    if (!games.length || !players.length) return [];

    return players.map((player) => {
      const partnerships = getPartnershipStats(player.id, games, players);
      return {
        player,
        partnerships: partnerships.filter(p => p.partner), // Filter out partnerships with missing partners
        totalGames: partnerships.reduce((sum, p) => sum + p.gamesPlayed, 0),
        averageWinRate: partnerships.length > 0 
          ? partnerships.reduce((sum, p) => sum + (p.gamesPlayed > 0 ? p.wins / p.gamesPlayed : 0), 0) / partnerships.length * 100
          : 0
      };
    }).filter(p => p.partnerships.length > 0);
  }, [games, players]);

  // Calculate global partnership statistics - moved here to ensure hooks are always called
  const globalStats = React.useMemo(() => {
    const totalPartnerships = allPartnerships.reduce((sum, p) => sum + p.partnerships.length, 0);
    const totalGames = allPartnerships.reduce((sum, p) => sum + p.totalGames, 0);
    const avgWinRate = allPartnerships.length > 0 
      ? allPartnerships.reduce((sum, p) => sum + p.averageWinRate, 0) / allPartnerships.length 
      : 0;

    // Find best overall partnerships (by win rate with minimum 5 games)
    const allPairings: Array<Partnership & { playerName: string }> = [];
    allPartnerships.forEach(playerData => {
      playerData.partnerships.forEach(partnership => {
        if (partnership.gamesPlayed >= 5) {
          allPairings.push({
            ...partnership,
            playerName: playerData.player.name
          });
        }
      });
    });

    const bestPartnerships = allPairings
      .sort((a, b) => {
        const aWinRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
        const bWinRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
        if (Math.abs(bWinRate - aWinRate) < 0.05) {
          return b.gamesPlayed - a.gamesPlayed;
        }
        return bWinRate - aWinRate;
      })
      .slice(0, 10);

    return { totalPartnerships, totalGames, avgWinRate, bestPartnerships };
  }, [allPartnerships]);

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

      {/* Global Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Partnerships"
          value={String(globalStats.totalPartnerships)}
          icon={<Users className="h-4 w-4" />}
          description="Unique player partnerships"
        />
        <StatCard
          title="Partnership Games"
          value={String(globalStats.totalGames)}
          icon={<Swords className="h-4 w-4" />}
          description="Total doubles matches"
        />
        <StatCard
          title="Average Win Rate"
          value={`${globalStats.avgWinRate.toFixed(0)}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Across all partnerships"
        />
        <StatCard
          title="Qualified Pairs"
          value={String(globalStats.bestPartnerships.length)}
          icon={<Trophy className="h-4 w-4" />}
          description="5+ games together"
        />
      </div>

      {/* Best Partnerships */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Partnerships</CardTitle>
          <p className="text-sm text-muted-foreground">
            Partnerships with the highest win rates (minimum 5 games)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {globalStats.bestPartnerships.map((partnership, index) => {
              const winRate = partnership.gamesPlayed > 0 ? (partnership.wins / partnership.gamesPlayed) * 100 : 0;
              
              return (
                <div
                  key={`${partnership.playerName}-${partnership.partner.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={partnership.partner.avatar}
                          alt={partnership.partner.name}
                        />
                        <AvatarFallback>
                          {partnership.partner.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">
                          {partnership.playerName} & {partnership.partner.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {partnership.gamesPlayed} games played
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      {winRate.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {partnership.wins}-{partnership.losses}
                    </div>
                  </div>
                </div>
              );
            })}
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
                  const bestPartnership = playerData.partnerships.reduce((best, current) => {
                    const currentWinRate = current.gamesPlayed > 0 ? current.wins / current.gamesPlayed : 0;
                    const bestWinRate = best.gamesPlayed > 0 ? best.wins / best.gamesPlayed : 0;
                    
                    if (Math.abs(currentWinRate - bestWinRate) < 0.1) {
                      return current.gamesPlayed > best.gamesPlayed ? current : best;
                    }
                    return currentWinRate > bestWinRate ? current : best;
                  }, playerData.partnerships[0]);

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
        </CardContent>
      </Card>
    </div>
  );
}