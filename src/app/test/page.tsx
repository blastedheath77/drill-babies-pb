'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Scroll Wheel Number Picker Component
function ScrollWheelPicker({ value, onChange, min = 0, max = 15 }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const [offset, setOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleStart = (clientY: number) => {
    if (!isExpanded) {
      setIsExpanded(true);
      return;
    }
    
    setIsDragging(true);
    setStartY(clientY);
    setStartValue(value);
    setOffset(0);
    
    // Prevent pull-to-refresh, page scrolling, and other browser gestures
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';
  };

  const handleMove = (clientY: number) => {
    if (!isDragging || !isExpanded) return;
    
    const deltaY = startY - clientY;
    const sensitivity = 20; // pixels per step - increased for better control
    const steps = Math.round(deltaY / sensitivity);
    const newValue = Math.max(min, Math.min(max, startValue + steps));
    
    // Update offset for smooth visual feedback
    setOffset(deltaY % sensitivity);
    
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setOffset(0);
    
    // Re-enable pull-to-refresh, page scrolling, and other browser gestures
    document.body.style.overscrollBehavior = '';
    document.body.style.overflow = '';
    document.documentElement.style.overscrollBehavior = '';
    document.documentElement.style.overflow = '';
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleMouseUp = () => handleEnd();
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };
    const handleTouchEnd = () => handleEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, startY, startValue, value, min, max]);

  // Cleanup overscroll behavior and page scrolling on unmount
  useEffect(() => {
    return () => {
      if (isDragging) {
        document.body.style.overscrollBehavior = '';
        document.body.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
        document.documentElement.style.overflow = '';
      }
    };
  }, [isDragging]);

  // Calculate which numbers to show (current value ± 2)
  const getVisibleNumbers = () => {
    const visible = [];
    for (let i = value - 2; i <= value + 2; i++) {
      if (i >= min && i <= max) {
        visible.push(i);
      }
    }
    return visible;
  };

  const visibleNumbers = getVisibleNumbers();
  const itemHeight = 40; // Height of each number item

  // Compact view when not expanded
  if (!isExpanded) {
    return (
      <div 
        ref={containerRef}
        onClick={handleClick}
        className={cn(
          "w-20 h-12 mx-auto border-2 border-border rounded-lg",
          "bg-background hover:bg-accent cursor-pointer transition-all duration-200",
          "flex items-center justify-center"
        )}
      >
        <div className="text-lg font-mono font-bold text-primary">
          {value}
        </div>
        <div className="ml-2 text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    );
  }

  // Expanded scroll wheel view
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative h-48 w-24 mx-auto border-2 border-border rounded-xl overflow-hidden",
        "bg-gradient-to-b from-muted/30 via-background to-muted/30",
        "cursor-grab active:cursor-grabbing animate-in zoom-in-95 duration-200",
        isDragging && "select-none"
      )}
      onMouseDown={(e) => handleStart(e.clientY)}
      onTouchStart={(e) => handleStart(e.touches[0].clientY)}
    >
      {/* Numbers container */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-100"
        style={{
          transform: `translateY(${isDragging ? -offset : 0}px)`
        }}
      >
        {visibleNumbers.map((num, index) => {
          const isCenter = num === value;
          const distanceFromCenter = Math.abs(num - value);
          
          return (
            <div
              key={num}
              className={cn(
                "flex items-center justify-center font-mono transition-all duration-200",
                isCenter
                  ? "text-3xl font-bold text-primary"
                  : distanceFromCenter === 1
                  ? "text-xl font-semibold text-foreground/80"
                  : "text-lg text-muted-foreground/60"
              )}
              style={{
                height: `${itemHeight}px`,
                transform: isCenter ? 'scale(1.1)' : distanceFromCenter === 1 ? 'scale(0.9)' : 'scale(0.7)'
              }}
            >
              {num}
            </div>
          );
        })}
      </div>
      
      {/* Center selection area */}
      <div className="absolute top-1/2 left-0 right-0 h-12 -translate-y-1/2 bg-primary/5 border-y-2 border-primary/20" />
      
      {/* Subtle gradient overlays for fade effect */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      
      {/* Scroll indicators */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-muted-foreground/40">
        <div className="w-6 h-1 bg-current rounded-full" />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-muted-foreground/40">
        <div className="w-6 h-1 bg-current rounded-full" />
      </div>
      
      {/* Close button */}
      <button
        onClick={() => setIsExpanded(false)}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// Button Grid Number Picker
function ButtonGridPicker({ value, onChange, min = 0, max = 15 }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      {/* Grid appears above the button */}
      {isOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg p-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-4 gap-2 w-48">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
              <Button
                key={num}
                variant={num === value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onChange(num);
                  setIsOpen(false);
                }}
                className="h-10 font-mono"
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Main button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-20 h-12 text-lg font-mono"
      >
        {value}
      </Button>
      
      {/* Backdrop to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Plus/Minus Stepper
function StepperPicker({ value, onChange, min = 0, max = 15 }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [isHolding, setIsHolding] = useState<'plus' | 'minus' | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const startHolding = (direction: 'plus' | 'minus') => {
    setIsHolding(direction);
    
    // Initial delay before rapid increment
    setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onChange((prev) => {
          const newValue = direction === 'plus' ? prev + 1 : prev - 1;
          return Math.max(min, Math.min(max, newValue));
        });
      }, 150); // Rapid increment every 150ms
    }, 500); // 500ms initial delay
  };

  const stopHolding = () => {
    setIsHolding(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={value <= min}
        onMouseDown={() => {
          onChange(Math.max(min, value - 1));
          startHolding('minus');
        }}
        onMouseUp={stopHolding}
        onMouseLeave={stopHolding}
        onTouchStart={() => {
          onChange(Math.max(min, value - 1));
          startHolding('minus');
        }}
        onTouchEnd={stopHolding}
        className="h-12 w-12"
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <div className="w-16 h-12 flex items-center justify-center border border-border rounded text-lg font-mono bg-background">
        {value}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        disabled={value >= max}
        onMouseDown={() => {
          onChange(Math.min(max, value + 1));
          startHolding('plus');
        }}
        onMouseUp={stopHolding}
        onMouseLeave={stopHolding}
        onTouchStart={() => {
          onChange(Math.min(max, value + 1));
          startHolding('plus');
        }}
        onTouchEnd={stopHolding}
        className="h-12 w-12"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Slider Picker
function SliderPicker({ value, onChange, min = 0, max = 15 }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono w-6">{min}</span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-mono">
            {value}
          </div>
        </div>
        <span className="text-sm font-mono w-6">{max}</span>
      </div>
    </div>
  );
}

// Direct Input with Validation
function DirectInputPicker({ value, onChange, min = 0, max = 15 }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [inputValue, setInputValue] = useState(value.toString());
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const num = parseInt(newValue);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    // Reset to current value if invalid
    setInputValue(value.toString());
  };

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  return (
    <div className="w-20">
      <Input
        type="number"
        min={min}
        max={max}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="text-center font-mono text-lg h-12"
        placeholder={`${min}-${max}`}
      />
    </div>
  );
}

// Compact Team Score Input Component
function TeamScoreInput() {
  // Mock player data
  const mockPlayers = [
    { id: '1', name: 'John Smith', firstName: 'John', initials: 'JS' },
    { id: '2', name: 'Sarah Johnson', firstName: 'Sarah', initials: 'SJ' },
    { id: '3', name: 'Michael Davis', firstName: 'Michael', initials: 'MD' },
    { id: '4', name: 'Emma Wilson', firstName: 'Emma', initials: 'EW' },
    { id: '5', name: 'Christopher Brown', firstName: 'Chris', initials: 'CB' },
    { id: '6', name: 'Isabella Garcia', firstName: 'Bella', initials: 'IG' },
    { id: '7', name: 'Alexander Rodriguez', firstName: 'Alex', initials: 'AR' },
    { id: '8', name: 'Olivia Martinez', firstName: 'Olivia', initials: 'OM' },
  ];

  const [team1Player1, setTeam1Player1] = useState(mockPlayers[0]);
  const [team1Player2, setTeam1Player2] = useState(mockPlayers[1]);
  const [team1Score, setTeam1Score] = useState(11);
  const [team2Player1, setTeam2Player1] = useState(mockPlayers[2]);
  const [team2Player2, setTeam2Player2] = useState(mockPlayers[3]);
  const [team2Score, setTeam2Score] = useState(9);

  // Compact Player Selector Component
  function CompactPlayerSelector({ 
    player, 
    onChange, 
    otherSelectedPlayers 
  }: {
    player: typeof mockPlayers[0];
    onChange: (player: typeof mockPlayers[0]) => void;
    otherSelectedPlayers: typeof mockPlayers;
  }) {
    const [isOpen, setIsOpen] = useState(false);

    // Available players (excluding already selected ones)
    const availablePlayers = mockPlayers.filter(p => 
      p.id === player.id || !otherSelectedPlayers.some(selected => selected.id === p.id)
    );

    return (
      <div className="relative flex-1 min-w-0">
        {/* Player dropdown appears above - scaled to longest name */}
        {isOpen && (
          <div className="absolute bottom-12 left-0 z-50 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-max max-w-xs">
            {availablePlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onChange(p);
                  setIsOpen(false);
                }}
                className={cn(
                  "block w-full px-3 py-2 text-left hover:bg-accent transition-colors whitespace-nowrap",
                  p.id === player.id && "bg-primary text-primary-foreground"
                )}
              >
                <div className="font-medium">{p.name}</div>
              </button>
            ))}
          </div>
        )}

        {/* Compact player button - shows first name only */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full h-10 px-2 border border-border rounded bg-background hover:bg-accent transition-all duration-200",
            "flex items-center justify-between text-sm font-medium",
            isOpen && "bg-accent"
          )}
        >
          <span className="truncate">{player.firstName}</span>
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
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Score selector using button grid style
  function CompactScoreSelector({ value, onChange }: { value: number; onChange: (value: number) => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    const scores = Array.from({ length: 16 }, (_, i) => i); // 0-15

    return (
      <div className="relative">
        {/* Score grid appears above */}
        {isOpen && (
          <div className="absolute bottom-12 right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="grid grid-cols-4 gap-1 w-40">
              {scores.map((score) => (
                <Button
                  key={score}
                  variant={score === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    onChange(score);
                    setIsOpen(false);
                  }}
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
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-10 text-lg font-mono p-0"
        >
          {value}
        </Button>

        {/* Backdrop to close */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team 1 */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-muted-foreground">Team 1</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Player 1 */}
          <CompactPlayerSelector
            player={team1Player1}
            onChange={setTeam1Player1}
            otherSelectedPlayers={[team1Player2, team2Player1, team2Player2]}
          />
          
          {/* Plus icon */}
          <div className="text-muted-foreground shrink-0">
            <Plus className="h-4 w-4" />
          </div>
          
          {/* Player 2 */}
          <CompactPlayerSelector
            player={team1Player2}
            onChange={setTeam1Player2}
            otherSelectedPlayers={[team1Player1, team2Player1, team2Player2]}
          />
          
          {/* Score */}
          <div className="ml-2 shrink-0">
            <CompactScoreSelector value={team1Score} onChange={setTeam1Score} />
          </div>
        </div>
      </div>

      {/* VS indicator */}
      <div className="text-center">
        <span className="text-lg font-bold text-muted-foreground">VS</span>
      </div>

      {/* Team 2 */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-muted-foreground">Team 2</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Player 1 */}
          <CompactPlayerSelector
            player={team2Player1}
            onChange={setTeam2Player1}
            otherSelectedPlayers={[team1Player1, team1Player2, team2Player2]}
          />
          
          {/* Plus icon */}
          <div className="text-muted-foreground shrink-0">
            <Plus className="h-4 w-4" />
          </div>
          
          {/* Player 2 */}
          <CompactPlayerSelector
            player={team2Player2}
            onChange={setTeam2Player2}
            otherSelectedPlayers={[team1Player1, team1Player2, team2Player1]}
          />
          
          {/* Score */}
          <div className="ml-2 shrink-0">
            <CompactScoreSelector value={team2Score} onChange={setTeam2Score} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="text-center p-3 bg-muted rounded-lg">
        <div className="text-sm text-muted-foreground mb-2">Game Result</div>
        <div className="font-mono text-sm space-y-1">
          <div className="font-semibold">
            {team1Player1.firstName.charAt(0)}. {team1Player1.name.split(' ').slice(1).join(' ')} & {team1Player2.firstName.charAt(0)}. {team1Player2.name.split(' ').slice(1).join(' ')}: {team1Score}
          </div>
          <div className="font-semibold">
            {team2Player1.firstName.charAt(0)}. {team2Player1.name.split(' ').slice(1).join(' ')} & {team2Player2.firstName.charAt(0)}. {team2Player2.name.split(' ').slice(1).join(' ')}: {team2Score}
          </div>
        </div>
        <div className="text-sm mt-2 font-medium">
          {team1Score > team2Score ? 'Team 1 Wins!' : team2Score > team1Score ? 'Team 2 Wins!' : 'Tie Game'}
        </div>
      </div>
    </div>
  );
}

export default function TestPage() {
  const [scrollValue, setScrollValue] = useState(7);
  const [gridValue, setGridValue] = useState(3);
  const [stepperValue, setStepperValue] = useState(5);
  const [sliderValue, setSliderValue] = useState(8);
  const [inputValue, setInputValue] = useState(2);

  const resetAll = () => {
    setScrollValue(0);
    setGridValue(0);
    setStepperValue(0);
    setSliderValue(0);
    setInputValue(0);
  };

  return (
    <>
      <PageHeader
        title="Number Entry Testing"
        description="Experiment with different methods for entering numbers 0-15."
      />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Testing Different Input Methods</h2>
          <Button onClick={resetAll} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </div>

        {/* Team Score Input Test */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Compact Team & Score Input</CardTitle>
            <p className="text-sm text-muted-foreground">Mobile-optimized team and score entry for Log Game</p>
          </CardHeader>
          <CardContent>
            <TeamScoreInput />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Scroll Wheel Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scroll Wheel</CardTitle>
              <p className="text-sm text-muted-foreground">Click and drag up/down to change value</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollWheelPicker value={scrollValue} onChange={setScrollValue} />
              <p className="text-center text-sm">Current: <span className="font-mono font-bold">{scrollValue}</span></p>
            </CardContent>
          </Card>

          {/* Button Grid Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Button Grid</CardTitle>
              <p className="text-sm text-muted-foreground">Click to open number grid</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <ButtonGridPicker value={gridValue} onChange={setGridValue} />
              </div>
              <p className="text-center text-sm">Current: <span className="font-mono font-bold">{gridValue}</span></p>
            </CardContent>
          </Card>

          {/* Stepper Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plus/Minus Stepper</CardTitle>
              <p className="text-sm text-muted-foreground">Click or hold +/- buttons</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <StepperPicker value={stepperValue} onChange={setStepperValue} />
              </div>
              <p className="text-center text-sm">Current: <span className="font-mono font-bold">{stepperValue}</span></p>
            </CardContent>
          </Card>

          {/* Slider Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Slider</CardTitle>
              <p className="text-sm text-muted-foreground">Drag slider to change value</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <SliderPicker value={sliderValue} onChange={setSliderValue} />
              <p className="text-center text-sm">Current: <span className="font-mono font-bold">{sliderValue}</span></p>
            </CardContent>
          </Card>

          {/* Direct Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Direct Input</CardTitle>
              <p className="text-sm text-muted-foreground">Type number directly</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <DirectInputPicker value={inputValue} onChange={setInputValue} />
              </div>
              <p className="text-center text-sm">Current: <span className="font-mono font-bold">{inputValue}</span></p>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">All Values</CardTitle>
              <p className="text-sm text-muted-foreground">Summary of all inputs</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Scroll Wheel:</span>
                  <span className="font-mono font-bold">{scrollValue}</span>
                </div>
                <div className="flex justify-between">
                  <span>Button Grid:</span>
                  <span className="font-mono font-bold">{gridValue}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stepper:</span>
                  <span className="font-mono font-bold">{stepperValue}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slider:</span>
                  <span className="font-mono font-bold">{sliderValue}</span>
                </div>
                <div className="flex justify-between">
                  <span>Direct Input:</span>
                  <span className="font-mono font-bold">{inputValue}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span className="font-mono">
                    {scrollValue + gridValue + stepperValue + sliderValue + inputValue}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}