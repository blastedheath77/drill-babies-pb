'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Trophy, Calendar, Users, Target, Edit } from 'lucide-react';
import Link from 'next/link';
import { MatchResultDialog } from '@/components/match-result-dialog';
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
}

function MatchCard({ match, players, tournamentId }: MatchCardProps) {
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

      <div className="flex items-center justify-between">
        {/* Team 1 */}
        <div className="flex items-center gap-2 flex-1">
          <div className="flex -space-x-2">
            {team1.map((player) => (
              <Avatar key={player.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={player.avatar} alt={player.name} />
                <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{team1.map((p) => p.name).join(' & ')}</p>
            <p className="text-xs text-muted-foreground">
              Avg. Rating: {(team1.reduce((sum, p) => sum + p.rating, 0) / team1.length).toFixed(1)}
            </p>
          </div>
        </div>

        {/* VS */}
        <div className="mx-4 text-muted-foreground font-bold">VS</div>

        {/* Team 2 */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="text-right">
            <p className="font-medium text-sm">{team2.map((p) => p.name).join(' & ')}</p>
            <p className="text-xs text-muted-foreground">
              Avg. Rating: {(team2.reduce((sum, p) => sum + p.rating, 0) / team2.length).toFixed(1)}
            </p>
          </div>
          <div className="flex -space-x-2">
            {team2.map((player) => (
              <Avatar key={player.id} className="h-8 w-8 border-2 border-background">
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
          
          {match.status === 'pending' && (
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
  // Group matches by round
  const matchesByRound = matches.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, TournamentMatch[]>
  );

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
      <div className="flex items-center gap-4 mb-6">
        <Link href="/tournaments">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
            {getStatusBadge(tournament.status)}
          </div>
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>
      </div>

      {/* Tournament Info */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(tournament.createdDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Players</p>
                <p className="text-sm text-muted-foreground">
                  {tournament.playerIds.length} participants
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Format</p>
                <p className="text-sm text-muted-foreground">{tournament.format}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm text-muted-foreground">{tournament.type.replace('-', ' ')}</p>
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
                <div className="space-y-4">
                  {standings.map((standing, index) => (
                    <div
                      key={standing.playerId}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>

                      <Avatar className="h-10 w-10">
                        <AvatarImage src={standing.player.avatar} alt={standing.player.name} />
                        <AvatarFallback>{standing.player.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className="font-medium">{standing.player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rating: {standing.player.rating.toFixed(2)}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-sm font-medium">{standing.gamesPlayed}</p>
                          <p className="text-xs text-muted-foreground">Played</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-600">{standing.wins}</p>
                          <p className="text-xs text-muted-foreground">Wins</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-600">{standing.losses}</p>
                          <p className="text-xs text-muted-foreground">Losses</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {standing.winPercentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {standing.pointsDifference >= 0 ? '+' : ''}
                          {standing.pointsDifference}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {standing.pointsFor}-{standing.pointsAgainst}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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