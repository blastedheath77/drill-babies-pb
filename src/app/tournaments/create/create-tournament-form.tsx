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
import type { Player } from '@/lib/types';

type CreateTournamentForm = {
  name: string;
  description: string;
  format: 'singles' | 'doubles';
  type: 'round-robin' | 'single-elimination' | 'double-elimination';
  playerIds: string[];
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
    },
  });

  const watchedFormat = form.watch('format');

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

      const result = await createTournament({
        ...data,
        description: data.description || '',
      });

      if (result.success) {
        toast({
          title: 'Tournament Created!',
          description: 'Your tournament has been successfully created.',
        });

        // Navigate to the tournament detail page
        router.push(`/tournaments/${result.tournamentId}`);
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

  const getMatchCount = () => {
    const n = selectedPlayers.length;
    if (n < 2) return 0;

    if (form.watch('type') === 'round-robin') {
      if (watchedFormat === 'singles') {
        // Singles: n(n-1)/2
        return (n * (n - 1)) / 2;
      } else {
        // Doubles partner rotation: Each partnership appears exactly once
        // More manageable than every possible team combination
        if (n % 2 !== 0) return 0; // Need even number of players
        
        // Estimate based on partner rotation scheduling
        const totalPartnerships = (n * (n - 1)) / 2;
        const matchesPerRound = Math.floor(n / 4); // Each match uses 4 players
        const estimatedRounds = Math.ceil(totalPartnerships / matchesPerRound);
        
        // Return a more conservative estimate
        return Math.min(totalPartnerships, estimatedRounds * matchesPerRound);
      }
    } else {
      // Elimination: approximately n-1 matches for singles, teams-1 for doubles
      if (watchedFormat === 'singles') {
        return n - 1;
      } else {
        const teams = Math.floor(n / 2);
        return teams - 1;
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {selectedPlayers.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium">Tournament Preview</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlayers.length} players selected • Approximately {getMatchCount()}{' '}
                    matches
                  </p>
                </div>
              )}
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
              <FormField
                control={form.control}
                name="playerIds"
                render={() => (
                  <FormItem>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {players.map((player) => (
                        <FormItem
                          key={player.id}
                          className="flex flex-row items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={selectedPlayers.includes(player.id)}
                              onCheckedChange={() => handlePlayerToggle(player.id)}
                            />
                          </FormControl>
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={player.avatar} alt={player.name} />
                              <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                {player.name}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
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
          <Button type="submit" disabled={isSubmitting || selectedPlayers.length < 2} size="lg">
            {isSubmitting ? 'Creating...' : 'Create Tournament'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
