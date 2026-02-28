'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScoreSelector } from '@/components/ui/score-selector';
import { useToast } from '@/hooks/use-toast';
import { updateLeagueGameMatchScore } from '@/app/league-games/actions';
import type { LeagueGameMatch, DuprOpponentPlayer, Player } from '@/lib/types';

interface Props {
  match: LeagueGameMatch;
  matchIndex: number;
  leagueGameId: string;
  clubTeamPlayers: Player[];
  opponentTeam: DuprOpponentPlayer[];
  onScored: (index: number, updated: LeagueGameMatch) => void;
  children: React.ReactNode;
}

export function LeagueGameScoreDialog({
  match,
  matchIndex,
  leagueGameId,
  clubTeamPlayers,
  opponentTeam,
  onScored,
  children,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [clubScore, setClubScore] = useState(match.clubTeamScore ?? 0);
  const [opponentScore, setOpponentScore] = useState(match.opponentTeamScore ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateLeagueGameMatchScore({
        leagueGameId,
        matchIndex,
        clubTeamScore: clubScore,
        opponentTeamScore: opponentScore,
      });

      if (result.success) {
        onScored(matchIndex, {
          ...match,
          clubTeamScore: clubScore,
          opponentTeamScore: opponentScore,
          status: 'completed',
        });
        toast({ title: 'Score saved' });
        setOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabel = {
    mens_doubles: "Men's Doubles",
    womens_doubles: "Women's Doubles",
    mixed_doubles: 'Mixed Doubles',
  }[match.category];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            Match {match.matchNumber} — {categoryLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Teams display */}
        <div className="flex items-center justify-between py-4 border-y">
          {/* Club team */}
          <div className="text-center flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Your Club</p>
            <div className="flex justify-center -space-x-2 mb-2">
              {clubTeamPlayers.map((p) => (
                <Avatar key={p.id} className="h-9 w-9 border-2 border-background">
                  <AvatarImage src={p.avatar} alt={p.name} />
                  <AvatarFallback className="text-xs">{p.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-sm font-medium">
              {clubTeamPlayers.map((p) => p.name).join(' & ')}
            </p>
          </div>

          <div className="text-xl font-bold text-muted-foreground mx-4">VS</div>

          {/* Opponent team */}
          <div className="text-center flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Opponents</p>
            <div className="flex justify-center gap-1 mb-2">
              {opponentTeam.map((p, i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background"
                >
                  {p.name.substring(0, 2)}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium">
              {opponentTeam.map((p) => p.name).join(' & ')}
            </p>
          </div>
        </div>

        {/* Score selectors */}
        <div className="grid grid-cols-2 gap-8 py-4">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">Club Score</p>
            <ScoreSelector value={clubScore} onChange={setClubScore} maxScore={21} align="center" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">Opponent Score</p>
            <ScoreSelector value={opponentScore} onChange={setOpponentScore} maxScore={21} align="center" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : 'Save Score'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
