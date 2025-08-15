'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTournamentSchema } from '@/lib/validations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { createTournament } from '../actions';
import { useRouter } from 'next/navigation';
import { isOnline, offlineQueue } from '@/lib/offline-queue';
import type { Player } from '@/lib/types';

type CreateTournamentForm = {
  name: string;
  description: string;
  format: 'singles' | 'doubles';
  type: 'round-robin' | 'single-elimination' | 'double-elimination';
  playerIds: string[];
  maxRounds?: number;
  availableCourts: number;
};

interface CreateTournamentFormProps {
  players: Player[];
}

export function CreateTournamentForm({ players }: CreateTournamentFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreateTournamentForm>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      description: '',
      format: 'doubles',
      type: 'round-robin',
      playerIds: [],
      maxRounds: undefined,
      availableCourts: 2,
    },
  });

  const watchedFormat = form.watch('format');
  const watchedType = form.watch('type');
  const watchedMaxRounds = form.watch('maxRounds');
  const watchedCourts = form.watch('availableCourts');

  const handlePlayerToggle = (playerId: string) => {
    const newSelection = selectedPlayers.includes(playerId)
      ? selectedPlayers.filter((id) => id !== playerId)
      : [...selectedPlayers, playerId];

    setSelectedPlayers(newSelection);
    form.setValue('playerIds', newSelection);
  };

  const onSubmit = async (data: CreateTournamentForm) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Additional validation based on format
      if (data.format === 'doubles') {
        if (data.playerIds.length < 4) {
          toast({
            variant: 'destructive',
            title: 'Invalid Selection',
            description: 'At least 4 players are required for doubles tournaments.',
          });
          return;
        }
        if (data.playerIds.length % 2 !== 0) {
          toast({
            variant: 'destructive',
            title: 'Invalid Selection',
            description: 'Even number of players required for doubles tournaments.',
          });
          return;
        }
      }

      const tournamentData = {
        ...data,
        description: data.description || '',
      };

      if (isOnline()) {
        // Online: Create tournament immediately
        const result = await createTournament(tournamentData);

        if (result.success) {
          toast({
            title: 'Tournament Created!',
            description: 'Your tournament has been successfully created.',
          });

          // Force a router refresh to ensure the tournaments page gets fresh data
          router.refresh();
          
          // Navigate to the tournament detail page
          router.push(`/tournaments/${result.tournamentId}`);
        }
      } else {
        // Offline: Queue the tournament creation
        await offlineQueue.addOperation('create_tournament', tournamentData);
        
        toast({
          title: 'Tournament Queued',
          description: 'Tournament creation has been queued and will be created when you\'re back online.',
        });

        // Navigate back to tournaments page
        router.push('/tournaments');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create tournament.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate tournament preview statistics
  const getTournamentPreview = () => {
    const n = selectedPlayers.length;
    if (n < 2) return { matches: 0, rounds: 0, duration: 0, partnersPerPlayer: 0 };

    const courts = watchedCourts || 2;
    const maxRounds = watchedMaxRounds;

    if (watchedType === 'round-robin') {
      if (watchedFormat === 'singles') {
        // Singles round-robin
        const totalPossibleMatches = (n * (n - 1)) / 2;
        const matches = maxRounds ? Math.min(maxRounds, totalPossibleMatches) : totalPossibleMatches;
        const rounds = maxRounds || totalPossibleMatches;
        
        return {
          matches,
          rounds,
          duration: matches * 9, // 9 minutes per match
          partnersPerPlayer: 0, // Not applicable for singles
        };
      } else {
        // Doubles round-robin
        if (n % 2 !== 0) return { matches: 0, rounds: 0, duration: 0, partnersPerPlayer: 0 };
        
        if (maxRounds) {
          // Limited rounds - optimized algorithm
          const matches = maxRounds * courts;
          const partnersPerPlayer = Math.min(maxRounds, n - 1); // Each round = 1 new partner (ideally)
          
          return {
            matches,
            rounds: maxRounds,
            duration: matches * 9,
            partnersPerPlayer,
          };
        } else {
          // Full partner rotation
          const totalPartnerships = (n * (n - 1)) / 2;
          const matchesPerRound = Math.floor(n / 4) * courts;
          const rounds = Math.ceil(totalPartnerships / matchesPerRound);
          const matches = rounds * matchesPerRound;
          
          return {
            matches,
            rounds,
            duration: matches * 9,
            partnersPerPlayer: n - 1, // Everyone partners with everyone
          };
        }
      }
    } else {
      // Elimination tournaments
      const matches = watchedFormat === 'singles' ? n - 1 : Math.floor(n / 2) - 1;
      const rounds = Math.ceil(Math.log2(watchedFormat === 'singles' ? n : Math.floor(n / 2)));
      
      return {
        matches,
        rounds,
        duration: matches * 10, // Elimination matches tend to be longer
        partnersPerPlayer: watchedFormat === 'doubles' ? 1 : 0,
      };
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Tournament Details */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Spring Championship 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the tournament..."
                        className="h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="singles" />
                          </FormControl>
                          <FormLabel className="font-normal">Singles</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="doubles" />
                          </FormControl>
                          <FormLabel className="font-normal">Doubles</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="round-robin" />
                          </FormControl>
                          <FormLabel className="font-normal">Round Robin</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="single-elimination" />
                          </FormControl>
                          <FormLabel className="font-normal">Single Elimination</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="double-elimination" />
                          </FormControl>
                          <FormLabel className="font-normal">Double Elimination</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedType === 'round-robin' && (
                <>
                  <FormField
                    control={form.control}
                    name="maxRounds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Rounds (Optional)</FormLabel>
                        <FormControl>
                          <Select value={field.value?.toString() || 'unlimited'} onValueChange={(value) => field.onChange(value === 'unlimited' ? undefined : parseInt(value))} defaultValue="unlimited">
                            <SelectTrigger>
                              <SelectValue placeholder="Full tournament (no limit)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unlimited">Full Tournament</SelectItem>
                              <SelectItem value="6">6 Rounds (~2 hours)</SelectItem>
                              <SelectItem value="8">8 Rounds (~2.5 hours)</SelectItem>
                              <SelectItem value="10">10 Rounds (~3 hours)</SelectItem>
                              <SelectItem value="12">12 Rounds (~3.5 hours)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Limit rounds for shorter tournaments that fit your time constraint
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availableCourts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Courts</FormLabel>
                        <FormControl>
                          <Select value={field.value?.toString() || '2'} onValueChange={(value) => field.onChange(parseInt(value))} defaultValue="2">
                            <SelectTrigger>
                              <SelectValue placeholder="2 courts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Court</SelectItem>
                              <SelectItem value="2">2 Courts</SelectItem>
                              <SelectItem value="3">3 Courts</SelectItem>
                              <SelectItem value="4">4 Courts</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Number of courts available for matches (affects scheduling)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedPlayers.length > 0 && (() => {
                const preview = getTournamentPreview();
                return (
                  <div className="pt-4 border-t">
                    <p className="text-base sm:text-sm font-medium mb-3">Tournament Preview</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="font-medium text-blue-700 text-lg sm:text-base">{preview.matches} matches</div>
                        <div className="text-blue-600 text-sm">Total games</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="font-medium text-green-700 text-lg sm:text-base">{preview.rounds} rounds</div>
                        <div className="text-green-600 text-sm">Tournament length</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="font-medium text-purple-700 text-lg sm:text-base">{Math.round(preview.duration / 60)}h {preview.duration % 60}m</div>
                        <div className="text-purple-600 text-sm">Est. duration</div>
                      </div>
                      {watchedFormat === 'doubles' && preview.partnersPerPlayer > 0 && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <div className="font-medium text-orange-700 text-lg sm:text-base">{preview.partnersPerPlayer} partners</div>
                          <div className="text-orange-600 text-sm">Per player</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Player Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Players</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose players to participate in this tournament
                {watchedFormat === 'doubles' && ' (even number required)'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => {
                    const allPlayerIds = players.map(player => player.id);
                    setSelectedPlayers(allPlayerIds);
                    form.setValue('playerIds', allPlayerIds);
                  }}
                  className="w-full h-12 text-base font-medium"
                >
                  Select All Players ({players.length})
                </Button>
              </div>
              <FormField
                control={form.control}
                name="playerIds"
                render={() => (
                  <FormItem>
                    <div className="space-y-2 max-h-96 scrollbar-always-visible">
                      {players.map((player) => (
                        <FormItem
                          key={player.id}
                          className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handlePlayerToggle(player.id)}
                        >
                          <FormControl>
                            <Checkbox
                              checked={selectedPlayers.includes(player.id)}
                              onCheckedChange={() => handlePlayerToggle(player.id)}
                              className="h-5 w-5"
                            />
                          </FormControl>
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-10 w-10 sm:h-8 sm:w-8">
                              <AvatarImage src={player.avatar} alt={player.name} />
                              <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <FormLabel className="text-base sm:text-sm font-medium cursor-pointer">
                                {player.name}
                              </FormLabel>
                              <p className="text-sm sm:text-xs text-muted-foreground">
                                Rating: {player.rating.toFixed(2)} • {player.wins}W-{player.losses}L
                              </p>
                            </div>
                          </div>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button 
            type="submit" 
            disabled={isSubmitting || selectedPlayers.length < 2} 
            size="lg"
            className="w-full sm:w-auto h-12 text-base font-medium"
          >
            {isSubmitting ? 'Creating...' : 'Create Tournament'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
