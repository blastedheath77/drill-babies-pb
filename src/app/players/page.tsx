'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlayersInCircles } from '@/hooks/use-players';
import { usePartnershipsData } from '@/hooks/use-games';
import { useAuth } from '@/contexts/auth-context';
import { PlusCircle, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, ArrowDownRight, Users2, Swords } from 'lucide-react';
import { getPartnershipStats, getHeadToHeadStats, getGamesForPlayer } from '@/lib/data';
import type { Player, Game } from '@/lib/types';
import Link from 'next/link';

// Enhanced player stats calculation
function usePlayerStats(players: Player[], games: Game[]) {
  return React.useMemo(() => {
    if (!players || !games) return {};
    
    const playerStats: Record<string, {
      form: { icon: React.ReactNode; color: string; wins: number; total: number };
      ally: string;
      nemesis: string;
    }> = {};

    players.forEach(player => {
      // Form: Last 6 games performance with arrow indicator
      const playerGames = games
        .filter(game => game.playerIds.includes(player.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);

      let wins = 0;
      playerGames.forEach(game => {
        const isTeam1 = game.team1.playerIds.includes(player.id);
        const teamWon = game.team1.score > game.team2.score;
        if ((isTeam1 && teamWon) || (!isTeam1 && !teamWon)) wins++;
      });
      
      // Determine arrow direction and color based on wins
      let formIcon: React.ReactNode;
      let formColor: string;
      
      if (playerGames.length === 0) {
        formIcon = <ArrowRight className="h-4 w-4" />;
        formColor = "text-muted-foreground";
      } else if (wins === 0 || wins === 1) {
        formIcon = <TrendingDown className="h-4 w-4" />;
        formColor = "text-red-500";
      } else if (wins === 2) {
        formIcon = <ArrowDownRight className="h-4 w-4" />;
        formColor = "text-orange-500";
      } else if (wins === 3) {
        formIcon = <ArrowRight className="h-4 w-4" />;
        formColor = "text-yellow-500";
      } else if (wins === 4) {
        formIcon = <ArrowUpRight className="h-4 w-4" />;
        formColor = "text-lime-500";
      } else { // 5 or 6 wins
        formIcon = <TrendingUp className="h-4 w-4" />;
        formColor = "text-green-500";
      }
      
      const form = {
        icon: formIcon,
        color: formColor,
        wins,
        total: playerGames.length
      };

      // Ally: Best partnership
      const partnerships = getPartnershipStats(player.id, games, players);
      const bestPartner = partnerships
        .filter(p => p.gamesPlayed >= 2) // At least 2 games together
        .sort((a, b) => (b.wins / b.gamesPlayed) - (a.wins / a.gamesPlayed))[0];
      
      const ally = bestPartner ? bestPartner.partner.name.split(' ')[0] : '-';

      // Nemesis: Worst opponent (lowest win rate against)
      let worstOpponent: { name: string; winRate: number } | null = null;
      let lowestWinRate = 1;

      players.forEach(opponent => {
        if (opponent.id === player.id) return;
        
        const h2hStats = getHeadToHeadStats(player.id, opponent.id, games);
        if (h2hStats && h2hStats.gamesPlayed >= 2) {
          const winRate = h2hStats.wins / h2hStats.gamesPlayed;
          if (winRate < lowestWinRate) {
            lowestWinRate = winRate;
            worstOpponent = { name: opponent.name.split(' ')[0], winRate };
          }
        }
      });

      const nemesis = worstOpponent ? worstOpponent.name : '-';

      playerStats[player.id] = { form, ally, nemesis };
    });

    return playerStats;
  }, [players, games]);
}

export default function PlayersPage() {
  const { data: players, isLoading, error, isError } = usePlayersInCircles();
  const { games, isLoading: gamesLoading } = usePartnershipsData();
  const { canManagePlayers } = useAuth();
  
  // Calculate enhanced stats
  const playerStats = usePlayerStats(players || [], games || []);

  if (isError) {
    return (
      <>
        <PageHeader
          title="Club Players"
          description="Browse the list of all active players in the club."
        >
          {canManagePlayers() && (
            <Link href="/players/add">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            </Link>
          )}
        </PageHeader>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load players. {error?.message || 'Please try refreshing the page.'}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (isLoading || gamesLoading || !players) {
    return (
      <>
        <PageHeader
          title="Club Players"
          description="Browse the list of all active players in the club."
        >
          {canManagePlayers() && (
            <Link href="/players/add">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            </Link>
          )}
        </PageHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Club Players"
        description={`Browse the list of all ${players.length} active players in the club.`}
      >
        <Link href="/players/add">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </Link>
      </PageHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {players.map((player) => (
          <Link href={`/players/${player.id}`} key={player.id}>
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-background ring-2 ring-primary">
                  <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="player avatar" />
                  <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base truncate">{player.name}</h3>
                    <span className="font-medium text-sm">{player.rating.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Record:</span>
                        <span className="font-medium">{player.wins}W-{player.losses}L</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          Form:
                        </span>
                        <div className="flex items-center font-medium">
                          {playerStats[player.id]?.form ? (
                            <span className={playerStats[player.id]?.form.color}>
                              {playerStats[player.id]?.form.icon}
                            </span>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users2 className="h-3 w-3" />
                          Ally:
                        </span>
                        <span className="font-medium">{playerStats[player.id]?.ally || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Swords className="h-3 w-3" />
                          Nemesis:
                        </span>
                        <span className="font-medium">{playerStats[player.id]?.nemesis || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
