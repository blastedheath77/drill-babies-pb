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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { 
  Calendar,
  Trophy, 
  Users, 
  Swords, 
  Filter,
  ChevronDown,
  AlertTriangle,
  Crown,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useAllGames, useInvalidateGames } from '@/hooks/use-games';
import type { Game } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function GamesClient() {
  const { data: allGames, isLoading, error } = useAllGames();
  const { clearAndRefetch } = useInvalidateGames();
  const [timeFilter, setTimeFilter] = React.useState<string>('14');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');

  // Filter games based on selected criteria
  const filteredGames = React.useMemo(() => {
    if (!allGames) return [];

    let filtered = [...allGames];

    // Time filter
    if (timeFilter !== 'all') {
      const days = parseInt(timeFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filtered = filtered.filter(game => 
        new Date(game.date) >= cutoffDate
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(game => 
        game.type.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allGames, timeFilter, typeFilter]);

  // Calculate stats for the filtered games
  const stats = React.useMemo(() => {
    if (!filteredGames.length) {
      return {
        totalGames: 0,
        singlesGames: 0,
        doublesGames: 0,
        tournamentGames: 0,
        quickPlayGames: 0,
        casualGames: 0,
        averageScore: 0
      };
    }

    const singlesGames = filteredGames.filter(g => g.type === 'Singles').length;
    const doublesGames = filteredGames.filter(g => g.type === 'Doubles').length;
    const tournamentGames = filteredGames.filter(g => g.tournamentId && !g.isQuickPlay).length;
    const quickPlayGames = filteredGames.filter(g => g.isQuickPlay).length;
    const casualGames = filteredGames.filter(g => !g.tournamentId && !g.isQuickPlay).length;
    
    const totalPoints = filteredGames.reduce((sum, game) => 
      sum + game.team1.score + game.team2.score, 0
    );
    const averageScore = totalPoints / (filteredGames.length * 2);

    return {
      totalGames: filteredGames.length,
      singlesGames,
      doublesGames,
      tournamentGames,
      quickPlayGames,
      casualGames,
      averageScore: Math.round(averageScore * 10) / 10
    };
  }, [filteredGames]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Games"
          description="View all recent games and match results."
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Games"
          description="View all recent games and match results."
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load games data. Please refresh the page or check your connection.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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
      <PageHeader
        title="Games"
        description="View all recent games and match results."
      />

      {/* Condensed Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Games Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">{stats.totalGames}</div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.singlesGames}</div>
              <div className="text-sm text-muted-foreground">Singles</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.doublesGames}</div>
              <div className="text-sm text-muted-foreground">Doubles</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{stats.tournamentGames}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Trophy className="h-3 w-3" />
                Tournaments
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{stats.quickPlayGames}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Quick Play
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.casualGames}</div>
              <div className="text-sm text-muted-foreground">Casual</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Games List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Games History
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="singles">Singles</SelectItem>
                  <SelectItem value="doubles">Doubles</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => clearAndRefetch()}
                title="Clear cache and refetch games data"
              >
                🔄 Refresh
              </Button>
            </div>
          </div>
          {filteredGames.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredGames.length} games
              {timeFilter !== 'all' && ` from the last ${timeFilter} days`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No games found</h3>
              <p className="text-muted-foreground mb-4">
                {timeFilter !== 'all' 
                  ? `No games found in the last ${timeFilter} days with the selected filters.`
                  : 'No games match your current filter criteria.'
                }
              </p>
              <Button variant="outline" onClick={() => {setTimeFilter('all'); setTypeFilter('all');}}>
                Clear Filters
              </Button>
            </div>
          ) : (
            /* Desktop Table View */
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game) => {
                    const isTeam1Winner = game.team1.score > game.team2.score;
                    const isDraw = game.team1.score === game.team2.score;
                    
                    // Always put winner first (or maintain original order for draws)
                    const winnerFirst = !isDraw && !isTeam1Winner;
                    const firstTeam = winnerFirst ? game.team2 : game.team1;
                    const secondTeam = winnerFirst ? game.team1 : game.team2;
                    const firstScore = winnerFirst ? game.team2.score : game.team1.score;
                    const secondScore = winnerFirst ? game.team1.score : game.team2.score;
                    
                    return (
                      <TableRow key={game.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium">{formatDate(game.date)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{game.type === 'Singles' ? 'S' : 'D'}</Badge>
                            {game.tournamentId && (
                              <Trophy className="h-3 w-3 text-amber-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`text-sm ${!isDraw ? 'font-semibold' : ''}`}>
                              {firstTeam.players.map(p => p.name).join(' & ')}
                              {!isDraw && <Crown className="h-3 w-3 text-yellow-600 inline ml-1" />}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {secondTeam.players.map(p => p.name).join(' & ')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-mono text-lg">
                            <span className={!isDraw ? 'font-bold' : ''}>{firstScore}</span>
                            <span className="mx-2">-</span>
                            <span>{secondScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/games/${game.id}`}>
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            )}

          {/* Mobile Card View */}
          {filteredGames.length > 0 && (
            <div className="md:hidden space-y-4">
              {filteredGames.map((game) => {
                const isTeam1Winner = game.team1.score > game.team2.score;
                const isDraw = game.team1.score === game.team2.score;
                
                // Always put winner first (or maintain original order for draws)
                const winnerFirst = !isDraw && !isTeam1Winner;
                const firstTeam = winnerFirst ? game.team2 : game.team1;
                const secondTeam = winnerFirst ? game.team1 : game.team2;
                const firstScore = winnerFirst ? game.team2.score : game.team1.score;
                const secondScore = winnerFirst ? game.team1.score : game.team2.score;
                
                return (
                  <Link key={game.id} href={`/games/${game.id}`}>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{game.type === 'Singles' ? 'S' : 'D'}</Badge>
                              {game.tournamentId && (
                                <Trophy className="h-3 w-3 text-amber-600" />
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{formatDate(game.date)}</div>
                            </div>
                          </div>

                          {/* Teams and Score */}
                          <div className="space-y-2">
                            <div className={`flex items-center justify-between ${!isDraw ? 'font-semibold' : ''}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {firstTeam.players.map(p => p.name).join(' & ')}
                                </span>
                                {!isDraw && <Crown className="h-3 w-3 text-yellow-600" />}
                              </div>
                              <span className="text-lg font-mono font-bold">{firstScore}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="text-sm">
                                {secondTeam.players.map(p => p.name).join(' & ')}
                              </span>
                              <span className="text-lg font-mono">{secondScore}</span>
                            </div>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}