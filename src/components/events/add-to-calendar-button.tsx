'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import type { Event } from '@/lib/types';
import { downloadICS, getGoogleCalendarUrl, getOutlookCalendarUrl } from '@/lib/calendar-export';

interface AddToCalendarButtonProps {
  event: Event;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function AddToCalendarButton({
  event,
  variant = 'outline',
  size = 'default'
}: AddToCalendarButtonProps) {
  const handleDownloadICS = () => {
    downloadICS(event);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(event), '_blank');
  };

  const handleOutlookCalendar = () => {
    window.open(getOutlookCalendarUrl(event), '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics file
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlookCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Outlook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
