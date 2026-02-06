'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, HelpCircle, X } from 'lucide-react';
import type { RsvpResponse } from '@/lib/types';

interface RsvpButtonsProps {
  currentResponse?: RsvpResponse;
  onRsvp: (response: RsvpResponse) => void;
  disabled?: boolean;
  isLoading?: boolean;
  size?: 'default' | 'sm' | 'lg';
}

export function RsvpButtons({
  currentResponse,
  onRsvp,
  disabled = false,
  isLoading = false,
  size = 'default',
}: RsvpButtonsProps) {
  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default';

  return (
    <div className="flex gap-2">
      <Button
        variant={currentResponse === 'yes' ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => onRsvp('yes')}
        disabled={disabled || isLoading}
        className={cn(
          currentResponse === 'yes' && 'bg-green-600 hover:bg-green-700 text-white'
        )}
      >
        <Check className="h-4 w-4" />
        <span className="ml-1">Yes</span>
      </Button>

      <Button
        variant={currentResponse === 'maybe' ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => onRsvp('maybe')}
        disabled={disabled || isLoading}
        className={cn(
          currentResponse === 'maybe' && 'bg-yellow-500 hover:bg-yellow-600 text-white'
        )}
      >
        <HelpCircle className="h-4 w-4" />
        <span className="ml-1">Maybe</span>
      </Button>

      <Button
        variant={currentResponse === 'no' ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => onRsvp('no')}
        disabled={disabled || isLoading}
        className={cn(
          currentResponse === 'no' && 'bg-red-600 hover:bg-red-700 text-white'
        )}
      >
        <X className="h-4 w-4" />
        <span className="ml-1">No</span>
      </Button>
    </div>
  );
}
