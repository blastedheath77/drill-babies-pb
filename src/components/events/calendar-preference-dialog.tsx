'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CalendarPreference } from '@/lib/calendar-export';

interface CalendarPreferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (preference: CalendarPreference) => void;
}

export function CalendarPreferenceDialog({
  open,
  onOpenChange,
  onSelect,
}: CalendarPreferenceDialogProps) {
  const handleSelect = (preference: CalendarPreference) => {
    onSelect(preference);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="calendar-pref-desc">
        <DialogHeader>
          <DialogTitle>Add to your calendar?</DialogTitle>
          <p id="calendar-pref-desc" className="text-sm text-muted-foreground">
            Choose your preferred calendar app. This choice will be remembered for future events.
          </p>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={() => handleSelect('google')}
          >
            Google Calendar
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={() => handleSelect('ics')}
          >
            Apple Calendar / Other
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={() => handleSelect('outlook')}
          >
            Outlook
          </Button>
          <Button
            variant="ghost"
            className="justify-start h-auto py-3 text-muted-foreground"
            onClick={() => handleSelect('none')}
          >
            Don&apos;t add to calendar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
