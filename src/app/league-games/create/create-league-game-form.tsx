'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClub } from '@/contexts/club-context';
import { usePlayers } from '@/hooks/use-players';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  User,
  Trophy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createLeagueGame } from '../actions';
import type { Player } from '@/lib/types';

const SLOT_LABELS = ['M1', 'M2', 'M3', 'F1', 'F2', 'F3'];

export function CreateLeagueGameForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { selectedClub } = useClub();
  const { data: clubPlayers = [], isLoading: playersLoading } = usePlayers(selectedClub?.id);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Fixture details
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');

  // Step 2: Club player selection (3 men + 3 women)
  const [selectedMen, setSelectedMen] = useState<string[]>([]);
  const [selectedWomen, setSelectedWomen] = useState<string[]>([]);

  // Step 3: Opponent player names (indices 0-2 = men M1-M3, indices 3-5 = women F1-F3)
  const [opponentNames, setOpponentNames] = useState<string[]>(Array(6).fill(''));

  const menEligible = clubPlayers.filter(
    (p) => !p.gender || p.gender === 'he' || p.gender === 'they'
  );
  const womenEligible = clubPlayers.filter(
    (p) => !p.gender || p.gender === 'she' || p.gender === 'they'
  );

  const step1Valid = name.trim().length >= 3 && date.trim().length > 0;
  const step2Valid = selectedMen.length === 3 && selectedWomen.length === 3;
  const step3Valid = opponentNames.every((n) => n.trim().length > 0);

  const togglePlayer = (
    playerId: string,
    list: string[],
    setList: (v: string[]) => void,
    max: number
  ) => {
    if (list.includes(playerId)) {
      setList(list.filter((id) => id !== playerId));
    } else if (list.length < max) {
      setList([...list, playerId]);
    }
  };

  const handleOpponentNameChange = (index: number, value: string) => {
    setOpponentNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const handleSubmit = async () => {
    if (!selectedClub?.id) {
      toast({ variant: 'destructive', title: 'No club selected' });
      return;
    }

    setIsSubmitting(true);
    try {
      const opponentPlayers = opponentNames.map((n, index) => ({
        name: n.trim(),
        gender: index < 3 ? ('male' as const) : ('female' as const),
        slot: ((index % 3) + 1) as 1 | 2 | 3,
      }));

      const result = await createLeagueGame({
        name: name.trim(),
        date,
        venue: venue.trim() || undefined,
        clubId: selectedClub.id,
        clubPlayerIds: [...selectedMen, ...selectedWomen],
        opponentPlayers,
      });

      if (result.success && result.leagueGameId) {
        toast({ title: 'Fixture created!', description: '9 matches have been generated.' });
        router.push(`/league-games/${result.leagueGameId}`);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create fixture' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const PlayerCard = ({
    player,
    selected,
    onToggle,
    slotIndex,
  }: {
    player: Player;
    selected: boolean;
    onToggle: () => void;
    slotIndex?: number;
  }) => (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-primary bg-primary' : 'border-muted-foreground'
        }`}
      >
        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={player.avatar} alt={player.name} />
        <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{player.name}</p>
        <p className="text-xs text-muted-foreground">
          {player.rating.toFixed(2)} • {player.wins}W-{player.losses}L
        </p>
      </div>
      {selected && slotIndex !== undefined && (
        <Badge variant="secondary" className="text-xs">{SLOT_LABELS[slotIndex]}</Badge>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-600' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Fixture Details ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-600" />
              Step 1: Fixture Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Fixture Name *</Label>
              <Input
                id="name"
                placeholder="vs Edinburgh PB Club"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                e.g. "vs Edinburgh PB Club — 15 Mar 2026"
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue (optional)</Label>
              <Input
                id="venue"
                placeholder="Meadowbank Sports Centre"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Select Club Players ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-600" />
              Step 2: Club Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                Select <strong>3 men</strong> (M1, M2, M3) and <strong>3 women</strong> (F1, F2, F3) from your club. The order determines who plays together in mixed doubles.
              </AlertDescription>
            </Alert>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Men ({selectedMen.length}/3)</Label>
                <Badge variant={selectedMen.length === 3 ? 'default' : 'secondary'}>
                  {selectedMen.length === 3 ? 'Complete' : `${3 - selectedMen.length} more needed`}
                </Badge>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {playersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  menEligible.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      selected={selectedMen.includes(player.id)}
                      onToggle={() =>
                        togglePlayer(player.id, selectedMen, setSelectedMen, 3)
                      }
                      slotIndex={selectedMen.includes(player.id) ? selectedMen.indexOf(player.id) : undefined}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Women ({selectedWomen.length}/3)</Label>
                <Badge variant={selectedWomen.length === 3 ? 'default' : 'secondary'}>
                  {selectedWomen.length === 3 ? 'Complete' : `${3 - selectedWomen.length} more needed`}
                </Badge>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {womenEligible
                  .filter((p) => !selectedMen.includes(p.id))
                  .map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      selected={selectedWomen.includes(player.id)}
                      onToggle={() =>
                        togglePlayer(player.id, selectedWomen, setSelectedWomen, 3)
                      }
                      slotIndex={
                        selectedWomen.includes(player.id)
                          ? selectedWomen.indexOf(player.id) + 3
                          : undefined
                      }
                    />
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Players without a gender set appear in both sections
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Opponent Players (names only) ── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-600" />
              Step 3: Opponent Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Enter the names of the 6 opponent players. The order determines who plays together in mixed doubles (M1+F1, M2+F2, M3+F3).
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-2 block">Men (M1–M3)</Label>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-10 justify-center text-xs flex-shrink-0">
                        {SLOT_LABELS[i]}
                      </Badge>
                      <Input
                        placeholder={`Opponent man ${i + 1} name`}
                        value={opponentNames[i]}
                        onChange={(e) => handleOpponentNameChange(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-2 block">Women (F1–F3)</Label>
                <div className="space-y-2">
                  {[3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-10 justify-center text-xs flex-shrink-0">
                        {SLOT_LABELS[i]}
                      </Badge>
                      <Input
                        placeholder={`Opponent woman ${i - 2} name`}
                        value={opponentNames[i]}
                        onChange={(e) => handleOpponentNameChange(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!step3Valid || isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Fixture'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
