'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventTypeBadge } from './event-type-badge';
import { RsvpSummary } from './rsvp-list';
import { cn } from '@/lib/utils';
import { Calendar, Clock, MapPin, Repeat, Users } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import type { Event } from '@/lib/types';

interface EventCardProps {
  event: Event;
  className?: string;
  showRsvpSummary?: boolean;
}

export function EventCard({ event, className, showRsvpSummary = true }: EventCardProps) {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const eventIsPast = isPast(endDate);
  const isCancelled = event.status === 'cancelled';

  const getDateLabel = () => {
    if (isToday(startDate)) return 'Today';
    if (isTomorrow(startDate)) return 'Tomorrow';
    return format(startDate, 'EEE, MMM d');
  };

  const getTimeRange = () => {
    return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  };

  return (
    <Link href={`/events/${event.id}`}>
      <Card
        className={cn(
          'transition-shadow hover:shadow-md cursor-pointer',
          eventIsPast && 'opacity-60',
          isCancelled && 'border-red-200 bg-red-50/50',
          className
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <EventTypeBadge type={event.type} customType={event.customType} />
                {event.isRecurringInstance && (
                  <Badge variant="outline" className="text-xs">
                    <Repeat className="h-3 w-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="destructive" className="text-xs">
                    Cancelled
                  </Badge>
                )}
                {eventIsPast && !isCancelled && (
                  <Badge variant="secondary" className="text-xs">
                    Past
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg truncate">{event.title}</h3>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{getDateLabel()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{getTimeRange()}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}
        </CardContent>

        {showRsvpSummary && (
          <CardFooter className="pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <RsvpSummary counts={event.rsvpCounts} />
            </div>
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}

interface EventCardSkeletonProps {
  className?: string;
}

export function EventCardSkeleton({ className }: EventCardSkeletonProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
            <div className="h-6 w-3/4 bg-muted rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="h-4 w-24 bg-muted rounded" />
      </CardFooter>
    </Card>
  );
}
