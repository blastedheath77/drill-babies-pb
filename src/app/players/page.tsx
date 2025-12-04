'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlayers } from '@/hooks/use-players';
import { usePartnershipsData } from '@/hooks/use-games';
import { useAuth } from '@/contexts/auth-context';
import { useClub } from '@/contexts/club-context';
import { PlusCircle, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, ArrowDownRight, Users2, Swords } from 'lucide-react';
import { getPartnershipStats, getHeadToHeadStats, getGamesForPlayer, calculateExpectedWinRate } from '@/lib/data';
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

      // Ally: Best partnership (based on performance above expectation)
      const partnerships = getPartnershipStats(player.id, games, players);

      // Calculate performance bonus for each partnership
      const partnershipPerformance = partnerships
        .filter(p => p.gamesPlayed >= 5) // At least 5 games together
        .map(p => {
          const actualWinRate = p.wins / p.gamesPlayed;

          // Calculate expected win rate based on combined team rating
          // For doubles, the team rating is the average of both players
          const teamRating = (player.rating + p.partner.rating) / 2;

          // Get average opponent rating from games with this partner
          const partnerGames = games.filter(game =>
            game.type === 'Doubles' &&
            game.playerIds.includes(player.id) &&
            game.playerIds.includes(p.partner.id)
          );

          let totalOpponentRating = 0;
          let opponentCount = 0;

          partnerGames.forEach(game => {
            const playerTeam = game.team1.playerIds.includes(player.id) ? game.team1 : game.team2;
            const opponentTeam = game.team1.playerIds.includes(player.id) ? game.team2 : game.team1;

            // Calculate average opponent team rating
            const opponentRatings = opponentTeam.players.map(p => p.rating);
            const avgOpponentRating = opponentRatings.reduce((sum, r) => sum + r, 0) / opponentRatings.length;

            totalOpponentRating += avgOpponentRating;
            opponentCount++;
          });

          const avgOpponentRating = opponentCount > 0 ? totalOpponentRating / opponentCount : player.rating;
          const expectedWinRate = calculateExpectedWinRate(teamRating, avgOpponentRating);
          const performanceBonus = actualWinRate - expectedWinRate;

          return {
            ...p,
            actualWinRate,
            expectedWinRate,
            performanceBonus
          };
        })
        .sort((a, b) => b.performanceBonus - a.performanceBonus);

      // Debug logging for Andreas Jonsson
      if (player.name === 'Andreas Jonsson') {
        console.log('\n=== ANDREAS JONSSON ALLY CALCULATION ===');
        console.log(`Andreas Rating: ${player.rating.toFixed(2)}`);
        console.log('\nAll Partnerships (5+ games):');
        partnershipPerformance.forEach(p => {
          console.log(`\n${p.partner.name} (Rating: ${p.partner.rating.toFixed(2)})`);
          console.log(`  Games: ${p.gamesPlayed} (${p.wins}W-${p.gamesPlayed - p.wins}L)`);
          console.log(`  Team Rating: ${((player.rating + p.partner.rating) / 2).toFixed(2)}`);
          console.log(`  Actual Win Rate: ${(p.actualWinRate * 100).toFixed(1)}%`);
          console.log(`  Expected Win Rate: ${(p.expectedWinRate * 100).toFixed(1)}%`);
          console.log(`  Performance Bonus: ${(p.performanceBonus * 100).toFixed(1)}% ${p.performanceBonus > 0 ? '✓ ABOVE EXPECTED' : '✗ BELOW EXPECTED'}`);
        });
        console.log(`\nBest Ally: ${partnershipPerformance[0]?.partner.name || 'None'}`);
        console.log('=====================================\n');
      }

      const bestPartner = partnershipPerformance[0];
      const ally = bestPartner ? bestPartner.partner.name.split(' ')[0] : '-';

      // Nemesis: Opponent you underperform against most (based on rating expectation)
      const opponentPerformance = players
        .filter(opponent => opponent.id !== player.id)
        .map(opponent => {
          const h2hStats = getHeadToHeadStats(player.id, opponent.id, games);
          if (!h2hStats || h2hStats.gamesPlayed < 5) {
            return null; // Skip opponents with fewer than 5 games
          }

          const actualWinRate = h2hStats.wins / h2hStats.gamesPlayed;

          // For head-to-head, we need to consider team ratings
          // Get the games where they played against each other
          const h2hGames = games.filter(game =>
            game.playerIds.includes(player.id) &&
            game.playerIds.includes(opponent.id) &&
            !game.team1.playerIds.includes(player.id) === game.team1.playerIds.includes(opponent.id) // On opposite teams
          );

          // Calculate average team ratings for these matchups
          let totalPlayerTeamRating = 0;
          let totalOpponentTeamRating = 0;
          let validGamesCount = 0;

          h2hGames.forEach(game => {
            const playerTeam = game.team1.playerIds.includes(player.id) ? game.team1 : game.team2;
            const opponentTeam = game.team1.playerIds.includes(player.id) ? game.team2 : game.team1;

            // Calculate average team ratings
            const playerTeamRating = playerTeam.players.reduce((sum, p) => sum + p.rating, 0) / playerTeam.players.length;
            const opponentTeamRating = opponentTeam.players.reduce((sum, p) => sum + p.rating, 0) / opponentTeam.players.length;

            totalPlayerTeamRating += playerTeamRating;
            totalOpponentTeamRating += opponentTeamRating;
            validGamesCount++;
          });

          if (validGamesCount === 0) {
            return null;
          }

          const avgPlayerTeamRating = totalPlayerTeamRating / validGamesCount;
          const avgOpponentTeamRating = totalOpponentTeamRating / validGamesCount;
          const expectedWinRate = calculateExpectedWinRate(avgPlayerTeamRating, avgOpponentTeamRating);

          // Underperformance: how much worse you do than expected
          // Higher underperformance = bigger nemesis
          const underperformance = expectedWinRate - actualWinRate;

          return {
            opponent,
            actualWinRate,
            expectedWinRate,
            underperformance,
            gamesPlayed: h2hStats.gamesPlayed
          };
        })
        .filter(Boolean) // Remove nulls
        .sort((a, b) => (b?.underperformance || 0) - (a?.underperformance || 0)); // Sort by highest underperformance

      const worstOpponent = opponentPerformance[0];
      const nemesis = worstOpponent ? worstOpponent.opponent.name.split(' ')[0] : '-';

      playerStats[player.id] = { form, ally, nemesis };
    });

    return playerStats;
  }, [players, games]);
}

export default function PlayersPage() {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { data: players, isLoading, error, isError } = usePlayers(selectedClub?.id);
  const { games, isLoading: gamesLoading } = usePartnershipsData(selectedClub?.id);
  const { canManagePlayers } = useAuth();

  // Calculate enhanced stats
  const playerStats = usePlayerStats(players || [], games || []);

  const clubName = selectedClub ? selectedClub.name : 'All Clubs';

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <>
        <PageHeader
          title="Players"
          description="Browse the list of all active players."
        />
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Card className="max-w-md">
            <CardContent className="flex flex-col items-center justify-center text-center py-12 space-y-4">
              <Users2 className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Club Access</h3>
                <p className="text-muted-foreground mb-2">
                  You are not assigned to any clubs yet. Please contact an administrator to get access to a club.
                </p>
                <p className="text-sm text-muted-foreground">
                  Once you have club access, you'll be able to view players.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader
          title={`${clubName} Players`}
          description={`Browse the list of all active players${selectedClub ? ` in ${clubName}` : ''}.`}
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
          title={`${clubName} Players`}
          description={`Browse the list of all active players${selectedClub ? ` in ${clubName}` : ''}.`}
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
        title={`${clubName} Players`}
        description={`Browse the list of all ${players.length} active players${selectedClub ? ` in ${clubName}` : ''}.`}
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
