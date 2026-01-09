'use client';

import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlayers } from '@/hooks/use-players';
import { useRecentGames } from '@/hooks/use-games';
import { useClub } from '@/contexts/club-context';
import { BarChart, Trophy, Users, Swords, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/stat-card';

export default function Home() {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { data: allPlayers, isLoading: playersLoading, error: playersError } = usePlayers(selectedClub?.id);
  const { data: recentGames, isLoading: gamesLoading, error: gamesError } = useRecentGames(5, selectedClub?.id);

  // Filter out players with no games played and players excluded from rankings
  const players = allPlayers?.filter(player =>
    (player.wins + player.losses) > 0 && !player.excludeFromRankings
  ) || [];

  const isLoading = playersLoading || gamesLoading || clubsLoading;
  const hasError = playersError || gamesError;

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
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
              Once you have club access, you'll be able to view players, games, and statistics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col gap-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please refresh the page or check the database.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !players || !recentGames) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="hover:bg-card/80 transition-colors">
              <div className="flex flex-col space-y-1.5 p-6">
                <Skeleton className="h-4 w-32" />
                <div className="p-0 pt-2">
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Player Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <div className="ml-auto">
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Games</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 bg-secondary/50 rounded-lg">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Top Ranked Player Section */}
      <div className="w-full">
        {players.length > 0 && (
          <Card className="border-muted">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={players[0].avatar}
                    alt={players[0].name}
                    data-ai-hint="top player avatar"
                  />
                  <AvatarFallback className="text-lg">
                    {players[0].name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Top Ranked Player</span>
                  </div>
                  <Link
                    href={`/players/${players[0].id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {players[0].name}
                  </Link>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Rating</div>
                  <div className="text-lg font-bold font-mono">
                    {players[0].rating.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Player Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="hidden sm:table-cell">W/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={player.avatar}
                            alt={player.name}
                            data-ai-hint="player avatar"
                          />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Link
                          href={`/players/${player.id}`}
                          className="font-medium hover:underline"
                        >
                          {player.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {player.rating.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {player.wins} / {player.losses}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recentGames.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`}>
                <div className="text-sm p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{game.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(game.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div
                      className={`flex justify-between ${game.team1.score > game.team2.score ? 'font-bold' : ''}`}
                    >
                      <span>{game.team1.players.map((p) => p.name).join(' & ')}</span>
                      <span>{game.team1.score}</span>
                    </div>
                    <div
                      className={`flex justify-between ${game.team2.score > game.team1.score ? 'font-bold' : ''}`}
                    >
                      <span>{game.team2.players.map((p) => p.name).join(' & ')}</span>
                      <span>{game.team2.score}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
