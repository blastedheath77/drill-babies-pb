'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft,
  Crown,
  Target
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAllGames } from '@/hooks/use-games';
import type { Game } from '@/lib/types';

interface GameDetailsClientProps {
  gameId: string;
}

export function GameDetailsClient({ gameId }: GameDetailsClientProps) {
  const { data: allGames, isLoading, error } = useAllGames();
  const router = useRouter();

  const game = React.useMemo(() => {
    if (!allGames) return null;
    return allGames.find(g => g.id === gameId) || null;
  }, [allGames, gameId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Game Not Found</h1>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            {error ? "Failed to load game data" : "The requested game could not be found."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isTeam1Winner = game.team1.score > game.team2.score;
  const isTeam2Winner = game.team2.score > game.team1.score;
  const isDraw = game.team1.score === game.team2.score;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <PageHeader
            title="Match Summary"
            description={`${game.type} match on ${formatDate(game.date)}`}
          />
        </div>
      </div>

      {/* Match Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Game Type"
          value={game.type}
          icon={<Users className="h-4 w-4" />}
          description={game.type === 'Singles' ? '1v1 match' : '2v2 match'}
        />
        <StatCard
          title="Date"
          value={new Date(game.date).toLocaleDateString()}
          icon={<Calendar className="h-4 w-4" />}
          description={formatTime(game.date)}
        />
        <StatCard
          title="Final Score"
          value={`${game.team1.score}-${game.team2.score}`}
          icon={<Target className="h-4 w-4" />}
          description={isDraw ? 'Draw' : `${Math.abs(game.team1.score - game.team2.score)} point difference`}
        />
        <StatCard
          title="Tournament"
          value={game.tournamentId ? "Tournament Game" : "Casual Match"}
          icon={<Trophy className="h-4 w-4" />}
          description={game.tournamentId ? "Part of tournament" : "Regular game"}
        />
      </div>

      {/* Match Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team 1 */}
        <Card className={`${isTeam1Winner ? 'border-green-200 bg-green-50/50' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                Team 1
                {isTeam1Winner && <Crown className="h-5 w-5 text-yellow-600" />}
              </span>
              <Badge variant={isTeam1Winner ? 'default' : 'secondary'}>
                {game.team1.score} points
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {game.team1.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link 
                      href={`/players/${player.id}`}
                      className="font-semibold hover:underline"
                    >
                      {player.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Rating: {player.rating.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Rating Change */}
                {game.ratingChanges && game.ratingChanges[player.id] && (
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {game.ratingChanges[player.id].after > game.ratingChanges[player.id].before ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${
                        game.ratingChanges[player.id].after > game.ratingChanges[player.id].before
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {game.ratingChanges[player.id].after > game.ratingChanges[player.id].before ? '+' : ''}
                        {(game.ratingChanges[player.id].after - game.ratingChanges[player.id].before).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {game.ratingChanges[player.id].before.toFixed(2)} → {game.ratingChanges[player.id].after.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {isTeam1Winner && (
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="text-sm font-medium text-green-800 text-center">🏆 Winner</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team 2 */}
        <Card className={`${isTeam2Winner ? 'border-green-200 bg-green-50/50' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                Team 2
                {isTeam2Winner && <Crown className="h-5 w-5 text-yellow-600" />}
              </span>
              <Badge variant={isTeam2Winner ? 'default' : 'secondary'}>
                {game.team2.score} points
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {game.team2.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link 
                      href={`/players/${player.id}`}
                      className="font-semibold hover:underline"
                    >
                      {player.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Rating: {player.rating.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Rating Change */}
                {game.ratingChanges && game.ratingChanges[player.id] && (
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {game.ratingChanges[player.id].after > game.ratingChanges[player.id].before ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${
                        game.ratingChanges[player.id].after > game.ratingChanges[player.id].before
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {game.ratingChanges[player.id].after > game.ratingChanges[player.id].before ? '+' : ''}
                        {(game.ratingChanges[player.id].after - game.ratingChanges[player.id].before).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {game.ratingChanges[player.id].before.toFixed(2)} → {game.ratingChanges[player.id].after.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {isTeam2Winner && (
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="text-sm font-medium text-green-800 text-center">🏆 Winner</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match Statistics */}
      {game.ratingChanges && Object.keys(game.ratingChanges).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Changes</CardTitle>
            <p className="text-sm text-muted-foreground">
              How this match affected each player's rating
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(game.ratingChanges).map(([playerId, change]) => {
                const player = [...game.team1.players, ...game.team2.players].find(p => p.id === playerId);
                if (!player) return null;
                
                const ratingChange = change.after - change.before;
                const isPositive = ratingChange > 0;
                
                return (
                  <div key={playerId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.avatar} alt={player.name} />
                        <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {change.before.toFixed(2)} → {change.after.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-bold">
                          {isPositive ? '+' : ''}{ratingChange.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isDraw && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🤝</div>
              <h3 className="text-xl font-bold text-yellow-800">Draw Match</h3>
              <p className="text-yellow-700">Both teams scored {game.team1.score} points</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}