'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Edit2, Minus } from 'lucide-react';
import { LeagueGameScoreDialog } from './league-game-score-dialog';
import type { LeagueGameMatch, DuprOpponentPlayer, Player } from '@/lib/types';

interface Props {
  match: LeagueGameMatch;
  matchIndex: number;
  leagueGameId: string;
  opponentPlayers: DuprOpponentPlayer[];
  clubPlayers: Record<string, Player>;
  canEdit: boolean;
  onScored: (index: number, updated: LeagueGameMatch) => void;
}

export function LeagueGameMatchCard({
  match,
  matchIndex,
  leagueGameId,
  opponentPlayers,
  clubPlayers,
  canEdit,
  onScored,
}: Props) {
  const isComplete = match.status === 'completed';

  // Resolve club players for this match
  const clubTeamPlayers = (match.clubTeamPlayerIds ?? [])
    .map((id) => clubPlayers[id])
    .filter(Boolean) as Player[];

  // Resolve opponent players using slot keys (e.g. "female-2", "male-1")
  const opponentMap = new Map(
    (opponentPlayers ?? []).map((p) => [`${p.gender}-${p.slot}`, p])
  );
  const opponentTeam = (match.opponentTeamSlots ?? [])
    .map((slot) => opponentMap.get(slot))
    .filter(Boolean) as DuprOpponentPlayer[];

  const clubWon =
    isComplete &&
    match.clubTeamScore !== undefined &&
    match.opponentTeamScore !== undefined &&
    match.clubTeamScore > match.opponentTeamScore;

  const oppWon =
    isComplete &&
    match.clubTeamScore !== undefined &&
    match.opponentTeamScore !== undefined &&
    match.opponentTeamScore > match.clubTeamScore;

  return (
    <Card
      className={`transition-all ${
        isComplete ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-muted'
      }`}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Match label */}
          <div className="text-xs text-muted-foreground w-6 flex-shrink-0 text-center font-mono">
            {match.matchNumber}
          </div>

          {/* Club team */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {clubTeamPlayers.map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={p.avatar} alt={p.name} />
                    <AvatarFallback className="text-xs">
                      {p.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate max-w-[80px]">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isComplete ? (
              <div className="flex items-center gap-1.5 font-mono text-base">
                <span className={clubWon ? 'text-green-700 font-bold' : 'text-muted-foreground'}>
                  {match.clubTeamScore}
                </span>
                <span className="text-muted-foreground text-sm">:</span>
                <span className={oppWon ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                  {match.opponentTeamScore}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground font-mono text-sm flex items-center gap-1">
                <Minus className="h-3 w-3" />
                <span>:</span>
                <Minus className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Opponent team */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {opponentTeam.map((p, i) => (
                <span key={i} className="text-sm text-muted-foreground truncate max-w-[80px]">
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {isComplete && !canEdit && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {canEdit && (
              <LeagueGameScoreDialog
                match={match}
                matchIndex={matchIndex}
                leagueGameId={leagueGameId}
                clubTeamPlayers={clubTeamPlayers}
                opponentTeam={opponentTeam}
                onScored={onScored}
              >
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  {isComplete ? (
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <span className="text-xs font-medium text-primary">Enter</span>
                  )}
                </Button>
              </LeagueGameScoreDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
