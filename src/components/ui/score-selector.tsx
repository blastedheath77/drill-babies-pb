'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScoreSelectorProps {
  value: number;
  onChange: (value: number) => void;
  maxScore?: number;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function ScoreSelector({ value, onChange, maxScore = 15, className, align = 'right' }: ScoreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scores = Array.from({ length: maxScore + 1 }, (_, i) => i); // 0 to maxScore

  // Handle dropdown open/close with scroll prevention
  const handleToggle = () => {
    if (!isOpen) {
      // Calculate position for fixed popup
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const popupWidth = 240; // w-56 + padding = ~240px
        const popupHeight = 320; // approximate height

        let left: number;
        if (align === 'center') {
          // Center the popup on screen horizontally
          left = (window.innerWidth - popupWidth) / 2;
        } else if (align === 'left') {
          left = rect.left;
        } else {
          left = rect.right - popupWidth;
        }

        // Keep popup within screen bounds
        left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));

        // Position above the button
        const top = rect.top - popupHeight - 8;

        setPopupPosition({ top: Math.max(8, top), left });
      }

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
      {/* Score grid appears above - fixed positioning to escape dialog overflow */}
      {isOpen && (
        <div
          className="fixed z-[100] bg-background border border-border rounded-lg shadow-lg p-3 animate-in slide-in-from-bottom-2 duration-200"
          style={{ top: popupPosition.top, left: popupPosition.left }}
        >
          <div className="grid grid-cols-4 gap-2 w-56">
            {scores.map((score) => (
              <Button
                key={score}
                type="button"
                variant={score === value ? "default" : "outline"}
                size="sm"
                onClick={() => handleScoreSelect(score)}
                className="h-14 w-14 p-0 text-lg font-mono"
              >
                {score}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Score button */}
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        onClick={handleToggle}
        className="w-12 h-10 text-lg font-mono p-0 shrink-0"
      >
        {value}
      </Button>

      {/* Backdrop to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={handleBackdropClick}
        />
      )}
    </div>
  );
}