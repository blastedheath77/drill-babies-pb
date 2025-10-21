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
import { BarChart, Trophy, Users, Swords, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/stat-card';

export default function Home() {
  const { data: allPlayers, isLoading: playersLoading, error: playersError } = usePlayers();
  const { data: recentGames, isLoading: gamesLoading, error: gamesError } = useRecentGames(5);

  // Filter out players with no games played
  const players = allPlayers?.filter(player => (player.wins + player.losses) > 0) || [];

  const isLoading = playersLoading || gamesLoading;
  const hasError = playersError || gamesError;

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
      {/* Enhanced Top Ranked Player Section */}
      <div className="w-full">
        {players.length > 0 ? (
          <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 border-none shadow-xl dark:shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-24 -translate-x-24" />

            <CardHeader className="text-center pb-4 pt-6 relative z-10">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-white drop-shadow-md">
                <Trophy className="h-7 w-7 text-yellow-200 drop-shadow-lg" />
                Top Ranked Player
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-8 relative z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-full blur-xl scale-110" />
                  <Avatar className="relative h-24 w-24 border-4 border-white/80 shadow-2xl ring-4 ring-purple-300/50 dark:ring-purple-400/50">
                    <AvatarImage
                      src={players[0].avatar}
                      alt={players[0].name}
                      data-ai-hint="top player avatar"
                    />
                    <AvatarFallback className="bg-white text-purple-600 text-3xl font-bold">
                      {players[0].name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-1">
                  <Link
                    href={`/players/${players[0].id}`}
                    className="text-3xl font-extrabold text-white hover:text-purple-100 transition-colors drop-shadow-lg block"
                  >
                    {players[0].name}
                  </Link>
                  <div className="flex items-center justify-center gap-2 text-white/90">
                    <span className="text-sm font-medium">Rating:</span>
                    <span className="text-xl font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      {players[0].rating.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-600">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl text-gray-600 dark:text-gray-300">
                <Trophy className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                No Players Yet
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-500 dark:text-gray-400">Start by adding players and logging games!</p>
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
