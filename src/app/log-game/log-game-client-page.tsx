'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import type { Player } from '@/lib/types';
import { logGame } from '@/app/log-game/actions';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

interface LogGameClientPageProps {
  players: Player[];
}

const logGameSchema = z.object({
  gameType: z.enum(['singles', 'doubles']),
  team1Player1: z.string().min(1, 'Player is required'),
  team1Player2: z.string().optional(),
  team1Score: z.coerce.number().min(0),
  team2Player1: z.string().min(1, 'Player is required'),
  team2Player2: z.string().optional(),
  team2Score: z.coerce.number().min(0),
});

export function LogGameClientPage({ players }: LogGameClientPageProps) {
  const { toast } = useToast();
  const [gameType, setGameType] = useState<'singles' | 'doubles'>('doubles');
  const [team1Player1, setTeam1Player1] = useState<Player | null>(null);
  const [team1Player2, setTeam1Player2] = useState<Player | null>(null);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Player1, setTeam2Player1] = useState<Player | null>(null);
  const [team2Player2, setTeam2Player2] = useState<Player | null>(null);
  const [team2Score, setTeam2Score] = useState(0);

  // Compact Player Selector Component
  function CompactPlayerSelector({ 
    player, 
    onChange, 
    otherSelectedPlayers,
    label 
  }: {
    player: Player | null;
    onChange: (player: Player) => void;
    otherSelectedPlayers: (Player | null)[];
    label: string;
  }) {
    const [isOpen, setIsOpen] = useState(false);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Available players (excluding already selected ones) sorted alphabetically by first name
    const availablePlayers = players
      .filter(p => 
        !player || p.id === player.id || !otherSelectedPlayers.some(selected => selected && selected.id === p.id)
      )
      .sort((a, b) => {
        const aFirstName = a.name.split(' ')[0];
        const bFirstName = b.name.split(' ')[0];
        return aFirstName.localeCompare(bFirstName);
      });

    // Handle dropdown open/close with scroll prevention
    const handleToggle = () => {
      if (!isOpen) {
        // Opening dropdown - prevent scrolling
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        setIsOpen(true);
      } else {
        // Closing dropdown - restore scrolling
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
        setIsOpen(false);
      }
    };

    const handlePlayerSelect = (p: Player) => {
      onChange(p);
      // Restore scrolling when closing
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      setIsOpen(false);
    };

    const handleBackdropClick = () => {
      // Restore scrolling when closing
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      setIsOpen(false);
    };

    // Check scroll position and update indicators
    const checkScrollPosition = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1);
    }, []);

    // Update scroll indicators when dropdown opens
    useEffect(() => {
      if (isOpen) {
        setTimeout(checkScrollPosition, 10); // Small delay to ensure rendering is complete
      }
    }, [isOpen, checkScrollPosition]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (isOpen) {
          document.body.style.overflow = '';
          document.body.style.overscrollBehavior = '';
          document.documentElement.style.overflow = '';
          document.documentElement.style.overscrollBehavior = '';
        }
      };
    }, [isOpen]);

    return (
      <div className="relative flex-1 min-w-0">
        {/* Player dropdown appears centered on input field - expands up and down */}
        {isOpen && (
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg max-h-80 w-max min-w-full max-w-sm">
            {/* Top scroll indicator */}
            {canScrollUp && (
              <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-transparent h-3 flex items-start justify-center">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-muted-foreground/60 mt-1"></div>
              </div>
            )}
            
            {/* Scrollable content */}
            <div 
              ref={scrollContainerRef}
              className="overflow-y-auto scrollbar-always-visible max-h-72"
              onScroll={checkScrollPosition}
            >
              <div className={cn("py-2", canScrollUp && "pt-1", canScrollDown && "pb-1")}>
                {availablePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePlayerSelect(p)}
                    className={cn(
                      "block w-full px-3 py-2 text-left hover:bg-accent transition-colors whitespace-nowrap",
                      player && p.id === player.id && "bg-primary text-primary-foreground"
                    )}
                  >
                    <div className="font-medium">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Bottom scroll indicator */}
            {canScrollDown && (
              <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background to-transparent h-3 flex items-end justify-center">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-muted-foreground/60 mb-1"></div>
              </div>
            )}
          </div>
        )}

        {/* Compact player button - shows first name only */}
        <button
          onClick={handleToggle}
          className={cn(
            "w-full h-10 px-2 border border-border rounded bg-background hover:bg-accent transition-all duration-200",
            "flex items-center justify-between text-sm font-medium min-w-0",
            isOpen && "bg-accent",
            !player && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {player ? player.name.split(' ')[0] : `Select ${label}`}
          </span>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            className={cn("ml-1 transition-transform shrink-0", isOpen && "rotate-180")}
          >
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Backdrop to close */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleBackdropClick}
          />
        )}
      </div>
    );
  }

  // Score selector using button grid style
  function CompactScoreSelector({ value, onChange }: { value: number; onChange: (value: number) => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    const scores = Array.from({ length: 16 }, (_, i) => i); // 0-15

    // Handle dropdown open/close with scroll prevention
    const handleToggle = () => {
      if (!isOpen) {
        // Opening dropdown - prevent scrolling
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        setIsOpen(true);
      } else {
        // Closing dropdown - restore scrolling
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
        setIsOpen(false);
      }
    };

    const handleScoreSelect = (score: number) => {
      onChange(score);
      // Restore scrolling when closing
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      setIsOpen(false);
    };

    const handleBackdropClick = () => {
      // Restore scrolling when closing
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      setIsOpen(false);
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (isOpen) {
          document.body.style.overflow = '';
          document.body.style.overscrollBehavior = '';
          document.documentElement.style.overflow = '';
          document.documentElement.style.overscrollBehavior = '';
        }
      };
    }, [isOpen]);

    return (
      <div className="relative">
        {/* Score grid appears above - responsive positioning */}
        {isOpen && (
          <div className="absolute bottom-12 right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-2 animate-in slide-in-from-bottom-2 duration-200">
            <div className="grid grid-cols-4 gap-1 w-32">
              {scores.map((score) => (
                <Button
                  key={score}
                  variant={score === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScoreSelect(score)}
                  className="h-8 w-8 p-0 text-xs font-mono"
                >
                  {score}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Score button */}
        <Button
          variant="outline"
          onClick={handleToggle}
          className="w-12 h-10 text-lg font-mono p-0 shrink-0"
        >
          {value}
        </Button>

        {/* Backdrop to close */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleBackdropClick}
          />
        )}
      </div>
    );
  }

  async function onSubmit() {
    // Validate required fields
    if (!team1Player1 || !team2Player1) {
      toast({
        variant: 'destructive',
        title: 'Missing players',
        description: 'Please select at least one player for each team.',
      });
      return;
    }

    if (gameType === 'doubles' && (!team1Player2 || !team2Player2)) {
      toast({
        variant: 'destructive',
        title: 'Missing players',
        description: 'Please select both players for each team in doubles.',
      });
      return;
    }

    const values = {
      gameType,
      team1Player1: team1Player1.id,
      team1Player2: gameType === 'doubles' ? team1Player2?.id || '' : '',
      team1Score,
      team2Player1: team2Player1.id,
      team2Player2: gameType === 'doubles' ? team2Player2?.id || '' : '',
      team2Score,
    };

    try {
      await logGame(values);
      toast({
        title: 'Game logged!',
        description: 'The game has been successfully added to the records.',
      });
      // Reset form
      setTeam1Player1(null);
      setTeam1Player2(null);
      setTeam1Score(0);
      setTeam2Player1(null);
      setTeam2Player2(null);
      setTeam2Score(0);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error logging game',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Game Type Selector with Submit Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Game Type
                </label>
                <RadioGroup
                  value={gameType}
                  onValueChange={(value: 'singles' | 'doubles') => {
                    setGameType(value);
                    if (value === 'singles') {
                      setTeam1Player2(null);
                      setTeam2Player2(null);
                    }
                  }}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="singles" id="singles" />
                    <label htmlFor="singles" className="font-normal cursor-pointer">Singles</label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="doubles" id="doubles" />
                    <label htmlFor="doubles" className="font-normal cursor-pointer">Doubles</label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="shrink-0">
                <Button onClick={onSubmit}>Submit Game</Button>
              </div>
            </div>

            {/* Team 1 */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Team 1</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <CompactPlayerSelector
                    player={team1Player1}
                    onChange={setTeam1Player1}
                    otherSelectedPlayers={gameType === 'doubles' ? [team1Player2, team2Player1, team2Player2] : [team2Player1]}
                    label="Player 1"
                  />
                </div>
                
                {gameType === 'doubles' && (
                  <>
                    <div className="text-muted-foreground shrink-0 px-1">
                      <Plus className="h-3 w-3" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <CompactPlayerSelector
                        player={team1Player2}
                        onChange={setTeam1Player2}
                        otherSelectedPlayers={[team1Player1, team2Player1, team2Player2]}
                        label="Player 2"
                      />
                    </div>
                  </>
                )}
                
                <div className="ml-1 shrink-0">
                  <CompactScoreSelector value={team1Score} onChange={setTeam1Score} />
                </div>
              </div>
            </div>

            {/* VS indicator */}
            <div className="text-center">
              <span className="text-lg font-bold text-muted-foreground">VS</span>
            </div>

            {/* Team 2 */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Team 2</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <CompactPlayerSelector
                    player={team2Player1}
                    onChange={setTeam2Player1}
                    otherSelectedPlayers={gameType === 'doubles' ? [team1Player1, team1Player2, team2Player2] : [team1Player1]}
                    label="Player 1"
                  />
                </div>
                
                {gameType === 'doubles' && (
                  <>
                    <div className="text-muted-foreground shrink-0 px-1">
                      <Plus className="h-3 w-3" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <CompactPlayerSelector
                        player={team2Player2}
                        onChange={setTeam2Player2}
                        otherSelectedPlayers={[team1Player1, team1Player2, team2Player1]}
                        label="Player 2"
                      />
                    </div>
                  </>
                )}
                
                <div className="ml-1 shrink-0">
                  <CompactScoreSelector value={team2Score} onChange={setTeam2Score} />
                </div>
              </div>
            </div>

            {/* Game Result Summary */}
            {(team1Player1 && team2Player1) && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Game Result</div>
                <div className="font-mono text-sm space-y-1">
                  <div className="font-semibold">
                    {gameType === 'doubles' && team1Player2 && team2Player2 ? (
                      <>
                        {team1Player1.name.split(' ')[0].charAt(0)}. {team1Player1.name.split(' ').slice(1).join(' ')} & {team1Player2.name.split(' ')[0].charAt(0)}. {team1Player2.name.split(' ').slice(1).join(' ')}: {team1Score}
                      </>
                    ) : (
                      <>
                        {team1Player1.name.split(' ')[0].charAt(0)}. {team1Player1.name.split(' ').slice(1).join(' ')}: {team1Score}
                      </>
                    )}
                  </div>
                  <div className="font-semibold">
                    {gameType === 'doubles' && team1Player2 && team2Player2 ? (
                      <>
                        {team2Player1.name.split(' ')[0].charAt(0)}. {team2Player1.name.split(' ').slice(1).join(' ')} & {team2Player2.name.split(' ')[0].charAt(0)}. {team2Player2.name.split(' ').slice(1).join(' ')}: {team2Score}
                      </>
                    ) : (
                      <>
                        {team2Player1.name.split(' ')[0].charAt(0)}. {team2Player1.name.split(' ').slice(1).join(' ')}: {team2Score}
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm mt-2 font-medium">
                  {team1Score > team2Score ? 'Team 1 Wins!' : team2Score > team1Score ? 'Team 2 Wins!' : 'Tie Game'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}