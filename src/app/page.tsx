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
import { ThemeToggle } from '@/components/theme-toggle';

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
      {/* Theme Toggle for Testing */}
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      {/* Enhanced Top Ranked Player Section */}
      <div className="w-full">
        {players.length > 0 ? (
          <Card className="bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400 dark:from-yellow-600/80 dark:via-amber-600/80 dark:to-orange-600/80 border-2 border-yellow-400 dark:border-amber-500 shadow-lg dark:shadow-2xl">
            <CardHeader className="text-center pb-1">
              <CardTitle className="flex items-center justify-center gap-1 text-lg font-bold text-yellow-700 dark:text-amber-200">
                <Trophy className="h-5 w-5 text-yellow-600 dark:text-amber-300" />
                Top Ranked Player
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-2">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-14 w-14 border-3 border-yellow-400 dark:border-amber-400 shadow-lg dark:shadow-2xl">
                  <AvatarImage
                    src={players[0].avatar}
                    alt={players[0].name}
                    data-ai-hint="top player avatar"
                  />
                  <AvatarFallback className="bg-yellow-100 dark:bg-amber-800 text-yellow-800 dark:text-amber-200 text-lg font-bold">
                    {players[0].name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/players/${players[0].id}`}
                    className="text-xl font-bold text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 hover:underline transition-colors"
                  >
                    {players[0].name}
                  </Link>
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
