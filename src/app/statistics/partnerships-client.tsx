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
import { Users, Trophy } from 'lucide-react';
import type { Player, Partnership } from '@/lib/types';
import Link from 'next/link';
import { usePartnershipsData } from '@/hooks/use-games';
import { useCircles } from '@/hooks/use-circles';
import { useClub } from '@/contexts/club-context';
import { getPartnershipStats } from '@/lib/data';
import { Loader2, AlertCircle } from 'lucide-react';
import type { DateFilter } from './rankings-client';

interface PartnershipData {
  player: Player;
  partnerships: Partnership[];
  totalGames: number;
  averageWinRate: number;
}

interface BestPartnership extends Partnership {
  playerName: string;
}

interface PartnershipsClientProps {
  selectedCircleId: string | null;
  dateFilter: DateFilter;
  customStartDate: string;
  customEndDate: string;
}

// "Tom McNab" → "Tom M."
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function PartnershipsClientV2({
  selectedCircleId,
  dateFilter,
  customStartDate,
  customEndDate,
}: PartnershipsClientProps) {
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

  // Calculate partnerships
  const allPartnerships: PartnershipData[] = React.useMemo(() => {
    if (!games || !players || games.length === 0 || players.length === 0) {
      return [];
    }

    try {
      return players.map((player) => {
        const partnerships = getPartnershipStats(player.id, games, players);
        const validPartnerships = partnerships.filter(p => p.partner && p.gamesPlayed > 0);

        const playerDoublesGames = games.filter(game =>
          game.type === 'Doubles' &&
          (game.team1.playerIds.includes(player.id) || game.team2.playerIds.includes(player.id))
        );

        return {
          player,
          partnerships: validPartnerships,
          totalGames: playerDoublesGames.length,
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

  // Calculate best partnerships
  const bestPartnerships: BestPartnership[] = React.useMemo(() => {
    try {
      const allBestPartnerships: BestPartnership[] = [];
      const seenPartnerships = new Set<string>();

      allPartnerships.forEach(playerData => {
        playerData.partnerships
          .filter(p => p.gamesPlayed >= 3)
          .forEach(partnership => {
            const partnershipKey = [playerData.player.name, partnership.partner.name]
              .sort()
              .join('|');

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
        .slice(0, 10);
    } catch (error) {
      console.error('Error calculating best partnerships:', error);
      return [];
    }
  }, [allPartnerships]);

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
          <span className="text-muted-foreground">Loading partnership data...</span>
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
            <p className="font-medium">Failed to load partnership data</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allPartnerships.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No partnership data available. Play some doubles games to see partnerships!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Partnerships - Compact Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Top Partnerships
            <span className="text-xs font-normal text-muted-foreground">(min. 3 games)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {bestPartnerships.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No partnerships with 3+ games found yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Partnership</TableHead>
                  <TableHead className="text-center w-16">W-L</TableHead>
                  <TableHead className="text-right w-16">Win%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestPartnerships.map((partnership, index) => {
                  const winRate = partnership.gamesPlayed > 0 ? (partnership.wins / partnership.gamesPlayed) * 100 : 0;
                  return (
                    <TableRow key={`${partnership.playerName}-${partnership.partner.id}`}>
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {shortName(partnership.playerName)} & {shortName(partnership.partner.name)}
                      </TableCell>
                      <TableCell className="text-center">{partnership.wins}-{partnership.losses}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        winRate >= 70 ? 'text-green-600' :
                        winRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {winRate.toFixed(0)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Player Partnership Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Player Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center w-20">Partners</TableHead>
                  <TableHead className="text-center w-20">Games</TableHead>
                  <TableHead className="text-center w-20">Avg Win%</TableHead>
                  <TableHead className="w-40">Best Partner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPartnerships
                  .sort((a, b) => b.averageWinRate - a.averageWinRate)
                  .map((playerData) => {
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

                    return (
                      <TableRow key={playerData.player.id}>
                        <TableCell>
                          <Link href={`/players/${playerData.player.id}`}>
                            <div className="flex items-center gap-2 hover:underline cursor-pointer">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={playerData.player.avatar} alt={playerData.player.name} />
                                <AvatarFallback className="text-xs">{playerData.player.name.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{playerData.player.name}</span>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">{playerData.partnerships.length}</TableCell>
                        <TableCell className="text-center">{playerData.totalGames}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${
                            playerData.averageWinRate >= 70 ? 'text-green-600' :
                            playerData.averageWinRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {playerData.averageWinRate.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {bestPartnership ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={bestPartnership.partner.avatar} alt={bestPartnership.partner.name} />
                                <AvatarFallback className="text-[10px]">{bestPartnership.partner.name.substring(0, 1)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{shortName(bestPartnership.partner.name)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-2">
            {allPartnerships
              .sort((a, b) => b.averageWinRate - a.averageWinRate)
              .map((playerData) => {
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

                return (
                  <div key={playerData.player.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Link href={`/players/${playerData.player.id}`}>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={playerData.player.avatar} alt={playerData.player.name} />
                        <AvatarFallback className="text-xs">{playerData.player.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/players/${playerData.player.id}`}>
                        <div className="font-medium text-sm truncate hover:underline">{playerData.player.name}</div>
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {playerData.partnerships.length} partners · {playerData.totalGames} games
                        {bestPartnership && <> · Best: {shortName(bestPartnership.partner.name)}</>}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      playerData.averageWinRate >= 70 ? 'text-green-600' :
                      playerData.averageWinRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {playerData.averageWinRate.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
