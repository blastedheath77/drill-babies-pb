'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Event, RsvpResponse } from '@/lib/types';
import {
  buildEventDateMap,
  getEventsForDate,
  getDominantRsvpColor,
  getRsvpColorClass,
  formatDateKey,
} from '@/lib/event-utils';
import type { DayContentProps } from 'react-day-picker';

interface EventCalendarProps {
  events: Event[];
  userRsvps: Map<string, RsvpResponse>;
  selectedDate?: Date;
  onDateSelect: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}

export function EventCalendar({
  events,
  userRsvps,
  selectedDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
}: EventCalendarProps) {
  // Build event date map for efficient lookups
  const eventsByDate = useMemo(() => buildEventDateMap(events), [events]);

  // Custom day content renderer
  const renderDayContent = (props: DayContentProps) => {
    const { date } = props;
    const eventsOnDay = getEventsForDate(date, eventsByDate);

    // If no events on this day, render default
    if (eventsOnDay.length === 0) {
      return <>{format(date, 'd')}</>;
    }

    const hasMultiple = eventsOnDay.length > 1;
    const dominantColor = getDominantRsvpColor(eventsOnDay, userRsvps);
    const colorClass = getRsvpColorClass(dominantColor);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{format(date, 'd')}</span>
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              colorClass
            )}
            aria-label={`${eventsOnDay.length} event${hasMultiple ? 's' : ''}`}
          />
          {hasMultiple && (
            <span className="text-[9px] font-bold leading-none">+</span>
          )}
        </div>
      </div>
    );
  };

  // Handle day click
  const handleDayClick = (day: Date | undefined) => {
    if (!day) {
      onDateSelect(undefined);
      return;
    }

    // Toggle selection if clicking the same day
    if (selectedDate && formatDateKey(selectedDate) === formatDateKey(day)) {
      onDateSelect(undefined);
    } else {
      onDateSelect(day);
    }
  };

  return (
    <div className="w-full">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDayClick}
        month={currentMonth}
        onMonthChange={onMonthChange}
        className="rounded-md border"
        components={{
          DayContent: renderDayContent,
        }}
      />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Attending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Maybe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Not Attending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border border-gray-300" />
          <span>No Response</span>
        </div>
      </div>
    </div>
  );
}
