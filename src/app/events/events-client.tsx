'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EventCard, EventCardSkeleton } from '@/components/events';
import { EventCalendar } from '@/components/events/event-calendar';
import { useUpcomingEvents, usePastEvents, useUserRsvpsInClub } from '@/hooks/use-events';
import { useAuth } from '@/contexts/auth-context';
import { useClub } from '@/contexts/club-context';
import { PlusCircle, AlertTriangle, Calendar, Search, Filter, LayoutList } from 'lucide-react';
import type { Event, EventType } from '@/lib/types';

export function EventsClient() {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { isClubAdmin, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const {
    data: upcomingEvents,
    isLoading: upcomingLoading,
    error: upcomingError,
  } = useUpcomingEvents(selectedClub?.id);

  const {
    data: pastEvents,
    isLoading: pastLoading,
    error: pastError,
  } = usePastEvents(selectedClub?.id);

  // Fetch user RSVPs for calendar view
  const { data: userRsvps } = useUserRsvpsInClub(user?.id, selectedClub?.id);

  const isAdmin = selectedClub?.id ? isClubAdmin(selectedClub.id) : false;

  // Convert user RSVPs to Map for O(1) lookups
  const userRsvpsMap = useMemo(() => {
    const map = new Map<string, 'yes' | 'maybe' | 'no'>();
    userRsvps?.forEach((rsvp) => map.set(rsvp.eventId, rsvp.response));
    return map;
  }, [userRsvps]);

  // Combine all events for calendar view
  const allEvents = useMemo(() => {
    if (viewMode !== 'calendar') return [];
    return [...(upcomingEvents || []), ...(pastEvents || [])];
  }, [viewMode, upcomingEvents, pastEvents]);

  // Filter events for selected day
  const eventsOnSelectedDay = useMemo(() => {
    if (!selectedDate) return [];

    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    return allEvents.filter((event) => {
      const eventStart = parseISO(event.startTime);
      const eventEnd = parseISO(event.endTime);

      // Event starts on this day OR spans this day
      return (
        isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
        isWithinInterval(dayStart, { start: eventStart, end: eventEnd })
      );
    });
  }, [selectedDate, allEvents]);

  // Filter events
  const filterEvents = (events: Event[] | undefined) => {
    if (!events) return [];

    return events.filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDescription = event.description?.toLowerCase().includes(query);
        const matchesLocation = event.location?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesLocation) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && event.type !== typeFilter) {
        return false;
      }

      return true;
    });
  };

  const filteredUpcoming = useMemo(
    () => filterEvents(upcomingEvents),
    [upcomingEvents, searchQuery, typeFilter]
  );

  const filteredPast = useMemo(
    () => filterEvents(pastEvents),
    [pastEvents, searchQuery, typeFilter]
  );

  const clubName = selectedClub ? selectedClub.name : 'All Clubs';

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <>
        <PageHeader title="Events" description="View and manage club events." />
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Card className="max-w-md">
            <CardContent className="flex flex-col items-center justify-center text-center py-12 space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Club Access</h3>
                <p className="text-muted-foreground mb-2">
                  You are not assigned to any clubs yet. Please contact an administrator
                  to get access to a club.
                </p>
                <p className="text-sm text-muted-foreground">
                  Once you have club access, you'll be able to view events.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const isLoading = upcomingLoading || pastLoading;
  const error = upcomingError || pastError;

  if (error) {
    return (
      <>
        <PageHeader
          title={`${clubName} Events`}
          description={`View and manage events${selectedClub ? ` for ${clubName}` : ''}.`}
        >
          {isAdmin && (
            <Link href="/events/create">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
          )}
        </PageHeader>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load events. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${clubName} Events`}
        description={`View and manage events${selectedClub ? ` for ${clubName}` : ''}.`}
      >
        {isAdmin && (
          <Link href="/events/create">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        )}
      </PageHeader>

      {/* View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            size="sm"
          >
            <LayoutList className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
            size="sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>

        {/* Filters - only show in list view */}
        {viewMode === 'list' && (
          <>
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as EventType | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="league_match">League Match</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <EventCalendar
                events={allEvents}
                userRsvps={userRsvpsMap}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            </CardContent>
          </Card>

          {/* Selected Day Events */}
          {selectedDate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Events on {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                >
                  Clear Selection
                </Button>
              </div>

              {eventsOnSelectedDay.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No events on this day
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eventsOnSelectedDay.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {allEvents.length === 0 && !isLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No events scheduled</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* List View - Tabs */}
      {viewMode === 'list' && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'past')}>
          <TabsList className="mb-6">
          <TabsTrigger value="upcoming">
            Upcoming ({filteredUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({filteredPast.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredUpcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || typeFilter !== 'all'
                    ? 'No events match your filters.'
                    : 'There are no upcoming events scheduled.'}
                </p>
                {isAdmin && !searchQuery && typeFilter === 'all' && (
                  <Link href="/events/create">
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Event
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUpcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPast.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Past Events</h3>
                <p className="text-muted-foreground">
                  {searchQuery || typeFilter !== 'all'
                    ? 'No events match your filters.'
                    : 'There are no past events in the history.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPast.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      )}
    </>
  );
}
