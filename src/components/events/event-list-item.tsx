'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, HelpCircle, X, MapPin, Repeat } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import type { Event } from '@/lib/types';

interface EventListItemProps {
  event: Event;
  className?: string;
  showRsvpCounts?: boolean;
}

export function EventListItem({ event, className, showRsvpCounts = true }: EventListItemProps) {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const eventIsPast = isPast(endDate);
  const isCancelled = event.status === 'cancelled';

  // Determine if this event needs attention (no RSVPs or low response)
  const needsAttention = event.rsvpCounts.yes === 0 && event.rsvpCounts.maybe === 0 && event.rsvpCounts.no === 0;

  const getDateTimeLabel = () => {
    let dateLabel = '';
    if (isToday(startDate)) {
      dateLabel = 'Today';
    } else if (isTomorrow(startDate)) {
      dateLabel = 'Tomorrow';
    } else {
      dateLabel = format(startDate, 'EEE, d MMM');
    }

    const timeLabel = `at ${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`;
    return `${dateLabel} ${timeLabel}`;
  };

  return (
    <Link href={`/events/${event.id}`}>
      <Card
        className={cn(
          'transition-all hover:shadow-md cursor-pointer overflow-hidden',
          eventIsPast && 'opacity-60',
          isCancelled && 'border-red-200 bg-red-50/50',
          className
        )}
      >
        <div className="flex">
          {/* Left border accent - red/orange for events needing attention */}
          {needsAttention && !eventIsPast && !isCancelled && (
            <div className="w-1 bg-orange-500 flex-shrink-0" />
          )}

          {/* Date block on the left */}
          <div className={cn(
            "flex flex-col items-center justify-center px-4 py-4 bg-muted/30 min-w-[80px]",
            isCancelled && "bg-red-100/50"
          )}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {format(startDate, 'MMM')}
            </div>
            <div className={cn(
              "text-3xl font-bold leading-none mt-1",
              isCancelled ? "text-red-600" : "text-foreground"
            )}>
              {format(startDate, 'd')}
            </div>
          </div>

          {/* Event details on the right */}
          <div className="flex-1 px-4 py-3">
            {/* Title and badges */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-base leading-tight flex-1">
                {event.title}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {event.isRecurringInstance && (
                  <Badge variant="outline" className="text-xs h-5">
                    <Repeat className="h-3 w-3" />
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="destructive" className="text-xs h-5">
                    Cancelled
                  </Badge>
                )}
                {eventIsPast && !isCancelled && (
                  <Badge variant="secondary" className="text-xs h-5">
                    Past
                  </Badge>
                )}
              </div>
            </div>

            {/* Date and time */}
            <div className="text-sm text-muted-foreground mb-1">
              {getDateTimeLabel()}
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* RSVP counts */}
            {showRsvpCounts && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">{event.rsvpCounts.yes}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-500">
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{event.rsvpCounts.maybe}</span>
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <X className="h-4 w-4" />
                  <span className="text-sm font-medium">{event.rsvpCounts.no}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function EventListItemSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse overflow-hidden', className)}>
      <div className="flex">
        <div className="flex flex-col items-center justify-center px-4 py-4 bg-muted/30 min-w-[80px]">
          <div className="h-3 w-8 bg-muted rounded mb-2" />
          <div className="h-8 w-8 bg-muted rounded" />
        </div>
        <div className="flex-1 px-4 py-3">
          <div className="h-5 w-3/4 bg-muted rounded mb-2" />
          <div className="h-4 w-1/2 bg-muted rounded mb-1" />
          <div className="h-4 w-2/3 bg-muted rounded mb-3" />
          <div className="flex gap-3">
            <div className="h-4 w-8 bg-muted rounded" />
            <div className="h-4 w-8 bg-muted rounded" />
            <div className="h-4 w-8 bg-muted rounded" />
          </div>
        </div>
      </div>
    </Card>
  );
}
