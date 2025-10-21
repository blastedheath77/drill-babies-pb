'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { createQuickPlayTournament } from '../quick-play-actions';
import { useRouter } from 'next/navigation';
import { isOnline, offlineQueue } from '@/lib/offline-queue';
import { useQuery } from '@tanstack/react-query';
import { getPlayers } from '@/lib/data';
import { useCircles } from '@/hooks/use-circles';
import { CircleSelector } from '@/components/circle-selector';
import { PageHeader } from '@/components/page-header';
import { ArrowLeft, Zap, Users, Clock, Target } from 'lucide-react';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { calculateMaxUniqueRounds } from '@/lib/pairing-algorithms';

// Quick Play schema - simplified validation
const quickPlaySchema = z.object({
  name: z.string().min(1, 'Tournament name is required'),
  description: z.string().optional(),
  format: z.enum(['singles', 'doubles']),
  playerIds: z.array(z.string()).min(2, 'At least 2 players are required'),
  availableCourts: z.number().min(1).max(10).default(2),
  maxRounds: z.number().min(1).max(20).default(3),
}).refine((data) => {
  // Custom validation for player count based on format
  if (data.format === 'singles') {
    return data.playerIds.length >= 2;
  } else {
    return data.playerIds.length >= 4;
  }
}, {
  message: 'Singles needs 2+ players, Doubles needs 4+ players',
  path: ['playerIds']
});

type QuickPlayForm = z.infer<typeof quickPlaySchema>;

export function QuickPlayForm() {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const playerSelectionRef = useRef<HTMLDivElement>(null);

  // Fetch players and circles
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: circles = [] } = useCircles();

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = [...players];

    // Apply circle filtering
    if (selectedCircleId && circles.length > 0) {
      const selectedCircle = circles.find(c => c.id === selectedCircleId);
      if (selectedCircle) {
        filtered = filtered.filter(player =>
          selectedCircle.playerIds.includes(player.id)
        );
      }
    }

    // Sort by games played (descending - most games first)
    filtered.sort((a, b) => {
      const aGames = a.wins + a.losses + (a.draws || 0);
      const bGames = b.wins + b.losses + (b.draws || 0);
      return bGames - aGames;
    });

    return filtered;
  }, [players, selectedCircleId, circles]);

  const form = useForm<QuickPlayForm>({
    resolver: zodResolver(quickPlaySchema),
    defaultValues: {
      name: '',
      description: '',
      format: 'doubles',
      playerIds: [],
      availableCourts: 2,
      maxRounds: 3,
    },
  });

  const watchedFormat = form.watch('format');
  const watchedCourts = form.watch('availableCourts');
  const watchedRounds = form.watch('maxRounds');

  const handlePlayerToggle = (playerId: string) => {
    const newSelection = selectedPlayers.includes(playerId)
      ? selectedPlayers.filter((id) => id !== playerId)
      : [...selectedPlayers, playerId];

    setSelectedPlayers(newSelection);
    form.setValue('playerIds', newSelection);
    form.clearErrors('playerIds'); // Clear validation errors when selection changes
  };

  const onSubmit = async (data: QuickPlayForm) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Additional validation based on format
      if (data.format === 'singles' && data.playerIds.length < 2) {
        toast({
          variant: 'destructive',
          title: 'Invalid Selection',
          description: 'At least 2 players are required for singles.',
        });
        return;
      }

      if (data.format === 'doubles' && data.playerIds.length < 4) {
        toast({
          variant: 'destructive',
          title: 'Invalid Selection',
          description: 'At least 4 players are required for doubles.',
        });
        return;
      }

      const quickPlayData = {
        ...data,
        description: data.description || '',
        isQuickPlay: true,
        currentRound: data.maxRounds, // Set to maxRounds since all rounds will be generated
      };

      if (isOnline()) {
        // Online: Create Quick Play tournament immediately
        const result = await createQuickPlayTournament(quickPlayData);

        if (result.success) {
          toast({
            title: 'Quick Play Started!',
            description: 'Your quick play session has been created. Let the games begin!',
          });

          // Force a router refresh to ensure the tournaments page gets fresh data
          router.refresh();
          
          // Navigate to the tournament detail page
          router.push(`/tournaments/${result.tournamentId}`);
        }
      } else {
        // Offline: Queue the tournament creation
        await offlineQueue.addOperation('create_quick_play_tournament', quickPlayData);
        
        toast({
          title: 'Quick Play Queued',
          description: 'Quick play creation has been queued and will be created when you\'re back online.',
        });

        // Navigate back to tournaments page
        router.push('/tournaments');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create quick play session.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate quick play preview
  const getQuickPlayPreview = () => {
    const n = selectedPlayers.length;
    if (n < 2) return { 
      matchesThisRound: 0, 
      playersPerRound: 0, 
      playersOffCourt: 0,
      estimatedTime: 0,
      maxUniqueRounds: 0,
      canUseOptimalPairing: false
    };

    const courts = watchedCourts || 2;
    let maxUniqueRounds = 0;
    let canUseOptimalPairing = false;

    try {
      maxUniqueRounds = calculateMaxUniqueRounds(n, watchedFormat);
      canUseOptimalPairing = maxUniqueRounds > 0;
    } catch (error) {
      // Fallback if calculation fails
      canUseOptimalPairing = false;
    }

    if (watchedFormat === 'singles') {
      // Singles: pair up players for matches
      const matchesThisRound = Math.min(Math.floor(n / 2), courts);
      const playersPerRound = matchesThisRound * 2;
      const playersOffCourt = n - playersPerRound;
      const estimatedTime = 8; // 8 minutes per round

      return {
        matchesThisRound,
        playersPerRound,
        playersOffCourt,
        estimatedTime,
        maxUniqueRounds,
        canUseOptimalPairing
      };
    } else {
      // Doubles: create matches with 4 players each
      const maxMatchesByPlayers = Math.floor(n / 4);
      const matchesThisRound = Math.min(maxMatchesByPlayers, courts);
      const playersPerRound = matchesThisRound * 4;
      const playersOffCourt = n - playersPerRound;
      const estimatedTime = 10; // 10 minutes per round

      return {
        matchesThisRound,
        playersPerRound,
        playersOffCourt,
        estimatedTime,
        maxUniqueRounds,
        canUseOptimalPairing
      };
    }
  };

  const preview = getQuickPlayPreview();

  // Auto-scroll to keep player selection in view when tournament preview appears
  useEffect(() => {
    if (selectedPlayers.length > 0 && playerSelectionRef.current) {
      // Small delay to ensure the preview has rendered
      setTimeout(() => {
        playerSelectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
    }
  }, [selectedPlayers.length > 0]); // Only trigger when going from 0 to 1+ players

  if (playersLoading) {
    return (
      <>
        <PageHeader
          title="Quick Play"
          description="Quick friendly round-robin tournament"
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">Loading players...</div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Quick Play"
        description="Quick friendly round-robin tournament"
      >
        <Link href="/tournaments">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </Link>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Quick Play Details */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Tuesday Evening Quick Play" {...field} />
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
                          placeholder="Casual games with flexible rounds..."
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
                        Courts available for simultaneous matches
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxRounds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Rounds</FormLabel>
                      <FormControl>
                        <Select value={field.value?.toString() || '3'} onValueChange={(value) => field.onChange(parseInt(value))} defaultValue="3">
                          <SelectTrigger>
                            <SelectValue placeholder="3 rounds" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Round (~15 min)</SelectItem>
                            <SelectItem value="2">2 Rounds (~30 min)</SelectItem>
                            <SelectItem value="3">3 Rounds (~45 min)</SelectItem>
                            <SelectItem value="4">4 Rounds (~1 hour)</SelectItem>
                            <SelectItem value="5">5 Rounds (~1.25 hours)</SelectItem>
                            <SelectItem value="6">6 Rounds (~1.5 hours)</SelectItem>
                            <SelectItem value="8">8 Rounds (~2 hours)</SelectItem>
                            <SelectItem value="10">10 Rounds (~2.5 hours)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        Generate multiple rounds at once. You can always add more rounds later!
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedPlayers.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-base sm:text-sm font-medium mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Tournament Preview
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="font-medium text-green-700 text-lg sm:text-base">{preview.matchesThisRound * (watchedRounds || 3)} matches</div>
                        <div className="text-green-600 text-sm">Total ({watchedRounds || 3} rounds)</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="font-medium text-blue-700 text-lg sm:text-base">{preview.matchesThisRound} per round</div>
                        <div className="text-blue-600 text-sm">{preview.playersPerRound} playing, {preview.playersOffCourt} resting</div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div className="font-medium text-purple-700 text-sm">
                        ~{preview.estimatedTime * (watchedRounds || 3)} minutes total
                      </div>
                      <div className="text-purple-600 text-xs">
                        {preview.playersOffCourt > 0 
                          ? `${preview.playersOffCourt} player${preview.playersOffCourt > 1 ? 's' : ''} will rest each round (rotating)`
                          : 'All players will play each round'
                        }
                      </div>
                    </div>
                    
                    {preview.canUseOptimalPairing && (
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        <div className="font-medium text-emerald-700 text-sm flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          Optimal Pairing Available
                        </div>
                        <div className="text-emerald-600 text-xs">
                          {preview.maxUniqueRounds} unique round{preview.maxUniqueRounds !== 1 ? 's' : ''} possible before repetition
                          {watchedFormat === 'doubles' && selectedPlayers.length % 4 === 0 && 
                            ' - everyone will play with/against everyone!'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Player Selection */}
            <Card ref={playerSelectionRef}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Select Players
                  </span>
                  <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                    {selectedPlayers.length} selected
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Quick Play accepts any number of players
                  {watchedFormat === 'singles' ? ' (minimum 2)' : ' (minimum 4)'}
                </p>
              </CardHeader>
              <CardContent>
                {/* Circle Filter */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">Filter by Circle:</span>
                    <CircleSelector
                      selectedCircleId={selectedCircleId}
                      onCircleChange={setSelectedCircleId}
                      placeholder="All players"
                      showPlayerCount={false}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="mb-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => {
                      const allPlayerIds = filteredAndSortedPlayers.map(player => player.id);
                      setSelectedPlayers(allPlayerIds);
                      form.setValue('playerIds', allPlayerIds);
                    }}
                    className="flex-1 h-10 text-sm font-medium"
                  >
                    Select All ({filteredAndSortedPlayers.length})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => {
                      setSelectedPlayers([]);
                      form.setValue('playerIds', []);
                    }}
                    className="flex-1 h-10 text-sm font-medium"
                  >
                    Clear All
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="playerIds"
                  render={() => (
                    <FormItem>
                      <div className="space-y-1 max-h-96 scrollbar-always-visible">
                        {filteredAndSortedPlayers.map((player) => {
                          const gamesPlayed = player.wins + player.losses + (player.draws || 0);
                          return (
                          <FormItem
                            key={player.id}
                            className="flex flex-row items-center space-x-2 space-y-0 p-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors"
                          >
                            <FormControl>
                              <Checkbox
                                checked={selectedPlayers.includes(player.id)}
                                onCheckedChange={() => handlePlayerToggle(player.id)}
                                className="h-4 w-4"
                              />
                            </FormControl>
                            <div 
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() => handlePlayerToggle(player.id)}
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={player.avatar} alt={player.name} />
                                <AvatarFallback className="text-xs">{player.name.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <FormLabel className="text-sm font-medium cursor-pointer">
                                  {player.name}
                                </FormLabel>
                                <div className="text-xs text-muted-foreground">
                                  {gamesPlayed} games played
                                </div>
                              </div>
                            </div>
                          </FormItem>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Link href="/tournaments">
              <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto h-12 text-base font-medium">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || selectedPlayers.length < (watchedFormat === 'singles' ? 2 : 4)}
              size="lg"
              className="w-full sm:w-auto h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white dark:text-foreground"
            >
              {isSubmitting ? 'Starting...' : 'Start Quick Play'}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}