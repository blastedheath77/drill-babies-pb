'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { TournamentMatch, Player } from '@/lib/types';

interface TournamentBracketProps {
  matches: TournamentMatch[];
  playerMap: Map<string, Player>;
  tournamentType: 'single-elimination' | 'double-elimination' | 'round-robin';
  onRecordResult?: (match: TournamentMatch) => void;
}

interface BracketMatchProps {
  match: TournamentMatch;
  players: Map<string, Player>;
  onRecordResult?: (match: TournamentMatch) => void;
  position?: { x: number; y: number };
}

function BracketMatch({ match, players, onRecordResult, position }: BracketMatchProps) {
  const getMatchPlayers = () => {
    if (match.player1Id && match.player2Id) {
      return {
        team1: [players.get(match.player1Id)].filter(Boolean) as Player[],
        team2: [players.get(match.player2Id)].filter(Boolean) as Player[],
      };
    } else if (match.team1PlayerIds && match.team2PlayerIds) {
      return {
        team1: match.team1PlayerIds.map((id) => players.get(id)).filter(Boolean) as Player[],
        team2: match.team2PlayerIds.map((id) => players.get(id)).filter(Boolean) as Player[],
      };
    }
    return { team1: [], team2: [] };
  };

  const { team1, team2 } = getMatchPlayers();

  if (team1.length === 0 && team2.length === 0) {
    return (
      <div className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
        TBD
      </div>
    );
  }

  if (match.status === 'bye') {
    const advancingTeam = team1.length > 0 ? team1 : team2;
    return (
      <div className="w-48 h-32 border-2 border-orange-200 bg-orange-50 rounded-lg p-3 flex items-center justify-center">
        <div className="text-center">
          <Badge variant="secondary" className="mb-2">BYE</Badge>
          <div className="flex items-center justify-center gap-1">
            {advancingTeam.map((player) => (
              <Avatar key={player.id} className="h-6 w-6">
                <AvatarImage src={player.avatar} alt={player.name} />
                <AvatarFallback className="text-xs">{player.name.substring(0, 1)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="text-xs font-medium mt-1">
            {advancingTeam.map(p => p.name).join(' & ')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`w-48 h-32 transition-all hover:shadow-md ${
      match.status === 'completed' ? 'border-green-200 bg-green-50' :
      match.status === 'in-progress' ? 'border-blue-200 bg-blue-50' :
      'border-gray-200 hover:border-gray-300'
    }`}>
      <CardContent className="p-3 h-full">
        <div className="flex items-center justify-between mb-2">
          <Badge variant={
            match.status === 'completed' ? 'secondary' :
            match.status === 'in-progress' ? 'default' : 'outline'
          } className="text-xs">
            {match.status === 'completed' ? (
              <><CheckCircle className="w-3 h-3 mr-1" />Done</>
            ) : match.status === 'in-progress' ? (
              <><Clock className="w-3 h-3 mr-1" />Live</>
            ) : (
              <><Clock className="w-3 h-3 mr-1" />Pending</>
            )}
          </Badge>
          {match.status === 'pending' && onRecordResult && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => onRecordResult(match)}
            >
              Score
            </Button>
          )}
        </div>

        <div className="space-y-1">
          {/* Team 1 */}
          <div className={`flex items-center gap-2 p-1 rounded ${
            match.status === 'completed' && match.gameId ? 'font-semibold' : ''
          }`}>
            <div className="flex -space-x-1">
              {team1.map((player) => (
                <Avatar key={player.id} className="h-4 w-4 border border-background">
                  <AvatarImage src={player.avatar} alt={player.name} />
                  <AvatarFallback className="text-xs">{player.name.substring(0, 1)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{team1.map(p => p.name).join(' & ')}</div>
            </div>
            {match.status === 'completed' && (
              <div className="text-xs font-mono">11</div>
            )}
          </div>

          {/* Team 2 */}
          <div className={`flex items-center gap-2 p-1 rounded ${
            match.status === 'completed' && match.gameId ? 'font-semibold' : ''
          }`}>
            <div className="flex -space-x-1">
              {team2.map((player) => (
                <Avatar key={player.id} className="h-4 w-4 border border-background">
                  <AvatarImage src={player.avatar} alt={player.name} />
                  <AvatarFallback className="text-xs">{player.name.substring(0, 1)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{team2.map(p => p.name).join(' & ')}</div>
            </div>
            {match.status === 'completed' && (
              <div className="text-xs font-mono">7</div>
            )}
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-gray-100">
          <div className="text-xs text-gray-500 text-center">
            R{match.round} • M{match.matchNumber}
            {match.court && ` • Court ${match.court}`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SingleEliminationBracket({ matches, playerMap, onRecordResult }: TournamentBracketProps) {
  // Group matches by round
  const matchesByRound = matches.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, TournamentMatch[]>
  );

  const maxRound = Math.max(...Object.keys(matchesByRound).map(Number));
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 p-4" style={{ minWidth: `${rounds.length * 250}px` }}>
        {rounds.map((round) => {
          const roundMatches = matchesByRound[round] || [];
          
          return (
            <div key={round} className="flex-shrink-0">
              <div className="text-center mb-4">
                <Badge variant="outline" className="font-semibold">
                  {round === maxRound ? 'Final' : 
                   round === maxRound - 1 ? 'Semi-Final' :
                   round === maxRound - 2 ? 'Quarter-Final' :
                   `Round ${round}`}
                </Badge>
              </div>
              
              <div className="space-y-8">
                {roundMatches
                  .sort((a, b) => a.matchNumber - b.matchNumber)
                  .map((match, index) => (
                    <div key={match.id} style={{ 
                      marginTop: index > 0 ? `${Math.pow(2, round - 1) * 20 - 20}px` : '0' 
                    }}>
                      <BracketMatch 
                        match={match} 
                        players={playerMap} 
                        onRecordResult={onRecordResult}
                      />
                      
                      {/* Connection lines */}
                      {round < maxRound && (
                        <div className="relative">
                          <div 
                            className="absolute top-16 left-48 w-8 h-0.5 bg-gray-300"
                            style={{ zIndex: -1 }}
                          />
                          {index % 2 === 0 && roundMatches[index + 1] && (
                            <>
                              <div 
                                className="absolute left-56 bg-gray-300"
                                style={{ 
                                  top: '64px',
                                  width: '2px',
                                  height: `${Math.pow(2, round - 1) * 40}px`,
                                  zIndex: -1
                                }}
                              />
                              <div 
                                className="absolute w-8 h-0.5 bg-gray-300"
                                style={{ 
                                  top: `${64 + Math.pow(2, round - 1) * 40}px`,
                                  left: '224px',
                                  zIndex: -1
                                }}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundRobinBracket({ matches, playerMap, onRecordResult }: TournamentBracketProps) {
  // Group matches by round for round-robin display
  const matchesByRound = matches.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, TournamentMatch[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(matchesByRound)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([round, roundMatches]) => (
          <Card key={round}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="font-semibold">
                  Round {round}
                </Badge>
                <div className="text-sm text-gray-500">
                  {roundMatches.filter(m => m.status === 'completed').length} / {roundMatches.length} completed
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roundMatches
                  .sort((a, b) => a.matchNumber - b.matchNumber)
                  .map((match) => (
                    <BracketMatch 
                      key={match.id}
                      match={match} 
                      players={playerMap} 
                      onRecordResult={onRecordResult}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

export function TournamentBracket({ matches, playerMap, tournamentType, onRecordResult }: TournamentBracketProps) {
  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-16">
          <Trophy className="h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium">No Bracket Generated</p>
            <p className="text-gray-500">
              Tournament matches will appear here once the bracket is created.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tournament Progress */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Tournament Bracket</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{matches.filter(m => m.status === 'completed').length} / {matches.length} matches completed</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border-2 border-green-200 rounded"></div>
              <span>Completed</span>
              <div className="w-3 h-3 bg-blue-100 border-2 border-blue-200 rounded ml-3"></div>
              <span>In Progress</span>
              <div className="w-3 h-3 bg-gray-100 border-2 border-gray-200 rounded ml-3"></div>
              <span>Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket Display */}
      <Card>
        <CardContent className="p-4">
          {tournamentType === 'round-robin' ? (
            <RoundRobinBracket 
              matches={matches} 
              playerMap={playerMap} 
              tournamentType={tournamentType}
              onRecordResult={onRecordResult}
            />
          ) : (
            <SingleEliminationBracket 
              matches={matches} 
              playerMap={playerMap} 
              tournamentType={tournamentType}
              onRecordResult={onRecordResult}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}