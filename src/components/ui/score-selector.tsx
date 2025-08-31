'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScoreSelectorProps {
  value: number;
  onChange: (value: number) => void;
  maxScore?: number;
  className?: string;
}

export function ScoreSelector({ value, onChange, maxScore = 15, className }: ScoreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scores = Array.from({ length: maxScore + 1 }, (_, i) => i); // 0 to maxScore

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
    <div className={cn("relative", className)}>
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