'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Calendar, Users, Target, Edit, Plus, Zap } from 'lucide-react';
import Link from 'next/link';
import { MatchResultDialog } from '@/components/match-result-dialog';
import { useToast } from '@/hooks/use-toast';
import { addQuickPlayRound } from '../quick-play-actions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { Tournament, TournamentMatch, TournamentStanding, Player } from '@/lib/types';

interface TournamentClientProps {
  tournament: Tournament;
  matches: TournamentMatch[];
  standings: TournamentStanding[];
  playerMap: Map<string, Player>;
}

interface MatchCardProps {
  match: TournamentMatch;
  players: Map<string, Player>;
  tournamentId: string;
  canCreateTournaments: () => boolean;
}

function MatchCard({ match, players, tournamentId, canCreateTournaments }: MatchCardProps) {
  const getMatchPlayers = () => {
    if (match.player1Id && match.player2Id) {
      // Singles match
      return {
        team1: [players.get(match.player1Id)].filter(Boolean) as Player[],
        team2: [players.get(match.player2Id)].filter(Boolean) as Player[],
      };
    } else if (match.team1PlayerIds && match.team2PlayerIds) {
      // Doubles match
      return {
        team1: match.team1PlayerIds.map((id) => players.get(id)).filter(Boolean) as Player[],
        team2: match.team2PlayerIds.map((id) => players.get(id)).filter(Boolean) as Player[],
      };
    }
    return { team1: [], team2: [] };
  };

  const { team1, team2 } = getMatchPlayers();

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      'in-progress': 'default',
      completed: 'outline',
      bye: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (team1.length === 0 || team2.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          <p>Match data incomplete</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          Round {match.round} • Match {match.matchNumber}
        </span>
        {getStatusBadge(match.status)}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        {/* Team 1 */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex -space-x-2">
            {team1.map((player) => (
              <Avatar key={player.id} className="h-10 w-10 sm:h-8 sm:w-8 border-2 border-background">
                <AvatarImage src={player.avatar} alt={player.name} />
                <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="flex-1">
            <p className="font-medium text-base sm:text-sm">{team1.map((p) => p.name).join(' & ')}</p>
            <p className="text-sm sm:text-xs text-muted-foreground">
              Avg. Rating: {(team1.reduce((sum, p) => sum + p.rating, 0) / team1.length).toFixed(1)}
            </p>
          </div>
        </div>

        {/* VS */}
        <div className="mx-4 text-muted-foreground font-bold text-center hidden sm:block">VS</div>
        <div className="text-center text-muted-foreground font-bold text-sm py-2 sm:hidden">VS</div>

        {/* Team 2 */}
        <div className="flex items-center gap-3 flex-1 sm:justify-end">
          <div className="flex-1 sm:text-right">
            <p className="font-medium text-base sm:text-sm">{team2.map((p) => p.name).join(' & ')}</p>
            <p className="text-sm sm:text-xs text-muted-foreground">
              Avg. Rating: {(team2.reduce((sum, p) => sum + p.rating, 0) / team2.length).toFixed(1)}
            </p>
          </div>
          <div className="flex -space-x-2 order-first sm:order-last">
            {team2.map((player) => (
              <Avatar key={player.id} className="h-10 w-10 sm:h-8 sm:w-8 border-2 border-background">
                <AvatarImage src={player.avatar} alt={player.name} />
                <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center justify-between">
          {match.scheduledTime && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(match.scheduledTime).toLocaleString()}
              {match.court && ` • Court ${match.court}`}
            </div>
          )}
          
          {match.status === 'pending' && canCreateTournaments() && (
            <MatchResultDialog 
              match={match} 
              players={players} 
              tournamentId={tournamentId}
            >
              <Button variant="outline" size="sm" className="ml-auto">
                <Edit className="h-3 w-3 mr-1" />
                Record Result
              </Button>
            </MatchResultDialog>
          )}
          
          {match.status === 'completed' && match.gameId && (
            <Badge variant="secondary" className="ml-auto">
              <Trophy className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

export function TournamentClient({ tournament, matches, standings, playerMap }: TournamentClientProps) {
  const [isAddingRound, setIsAddingRound] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { canCreateTournaments } = useAuth();

  // Group matches by round
  const matchesByRound = matches.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, TournamentMatch[]>
  );

  const handleAddRound = async () => {
    if (isAddingRound) return;

    setIsAddingRound(true);
    try {
      const result = await addQuickPlayRound(tournament.id);
      
      if (result.success) {
        toast({
          title: 'Round Added!',
          description: `Round ${result.roundNumber} has been generated with new matches.`,
        });
        
        // Refresh the page to show new matches
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add round.',
      });
    } finally {
      setIsAddingRound(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      completed: 'secondary',
    } as const;

    const labels = {
      active: 'In Progress',
      completed: 'Completed',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/tournaments">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{tournament.name}</h1>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(tournament.status)}
          {tournament.isQuickPlay && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Zap className="h-3 w-3 mr-1" />
              Quick Play
            </Badge>
          )}
          
          {/* Add Round button for Quick Play tournaments */}
          {tournament.isQuickPlay && tournament.status === 'active' && canCreateTournaments() && (
            <Button 
              onClick={handleAddRound} 
              disabled={isAddingRound}
              className="bg-green-600 hover:bg-green-700 ml-auto text-xs sm:text-sm"
              size="sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {isAddingRound ? 'Adding...' : 'Add Round'}
            </Button>
          )}
        </div>
        
        {tournament.description && (
          <p className="text-sm text-muted-foreground">{tournament.description}</p>
        )}
      </div>

      {/* Tournament Info */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Created</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {formatDate(tournament.createdDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Players</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {tournament.playerIds.length} participants
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Format</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{tournament.format}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Type</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{tournament.type.replace('-', ' ')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="brackets" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="brackets">Brackets ({matches.length})</TabsTrigger>
          <TabsTrigger value="standings">Standings ({standings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="brackets">
          {Object.keys(matchesByRound).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(matchesByRound)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([round, roundMatches]) => (
                  <Card key={round}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Round {round}
                        <Badge variant="outline">
                          {roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {roundMatches
                          .sort((a, b) => a.matchNumber - b.matchNumber)
                          .map((match) => (
                            <MatchCard 
                              key={match.id} 
                              match={match} 
                              players={playerMap} 
                              tournamentId={tournament.id}
                              canCreateTournaments={canCreateTournaments}
                            />
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-16">
                <Trophy className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No Matches Yet</p>
                  <p className="text-muted-foreground">
                    Tournament matches will appear here once they are generated.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="standings">
          {standings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tournament Standings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Scheduled</TableHead>
                      <TableHead className="text-center">Played</TableHead>
                      <TableHead className="text-center">Wins</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Losses</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Win Rate</TableHead>
                      <TableHead className="text-center">Point Diff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((standing, index) => (
                      <TableRow key={standing.playerId}>
                        <TableCell>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={standing.player.avatar} alt={standing.player.name} />
                              <AvatarFallback>{standing.player.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{standing.player.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{standing.scheduledGames}</TableCell>
                        <TableCell className="text-center font-medium">{standing.gamesPlayed}</TableCell>
                        <TableCell className="text-center font-medium text-green-600">{standing.wins}</TableCell>
                        <TableCell className="text-center font-medium text-red-600 hidden sm:table-cell">{standing.losses}</TableCell>
                        <TableCell className="text-center font-medium hidden sm:table-cell">
                          {standing.winPercentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-right">
                            <div className="font-medium">
                              {standing.pointsDifference >= 0 ? '+' : ''}
                              {standing.pointsDifference}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {standing.pointsFor}-{standing.pointsAgainst}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-16">
                <Trophy className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No Standings Yet</p>
                  <p className="text-muted-foreground">
                    Player standings will appear here once games are played.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}