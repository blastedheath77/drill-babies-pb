'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RankingsClient } from './rankings-client';
import { PartnershipsClientV2 } from './partnerships-client';
import { HeadToHeadClient } from './head-to-head-client';
import { DataErrorBoundary } from '@/components/data-error-boundary';
import { CircleSelector } from '@/components/circle-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Filter } from 'lucide-react';
import type { DateFilter } from './rankings-client';

export function StatisticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Read URL params AFTER mount (safe - avoids hydration issues)
  useEffect(() => {
    if (!isInitialized && searchParams) {
      const circleParam = searchParams.get('circle');
      const periodParam = searchParams.get('period') as DateFilter;
      const startParam = searchParams.get('start');
      const endParam = searchParams.get('end');

      if (circleParam) {
        setSelectedCircleId(circleParam);
      }
      if (periodParam && ['all', '2weeks', '1month', '2months', 'custom'].includes(periodParam)) {
        setDateFilter(periodParam);
      }
      if (startParam) {
        setCustomStartDate(startParam);
      }
      if (endParam) {
        setCustomEndDate(endParam);
      }
      setIsInitialized(true);
    }
  }, [searchParams, isInitialized]);

  // Update URL when circle selection changes
  const handleCircleChange = (circleId: string | null) => {
    setSelectedCircleId(circleId);

    try {
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (circleId) {
        params.set('circle', circleId);
      } else {
        params.delete('circle');
      }

      const newUrl = params.toString() ? `?${params.toString()}` : '/statistics';
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  // Update URL when date filter changes
  const handleDateFilterChange = (period: DateFilter) => {
    setDateFilter(period);

    if (period !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }

    try {
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (period !== 'all') {
        params.set('period', period);
      } else {
        params.delete('period');
      }

      if (period !== 'custom') {
        params.delete('start');
        params.delete('end');
      }

      const newUrl = params.toString() ? `?${params.toString()}` : '/statistics';
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  // Update URL when custom dates change
  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);

    try {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('period', 'custom');
      if (start) {
        params.set('start', start);
      } else {
        params.delete('start');
      }
      if (end) {
        params.set('end', end);
      } else {
        params.delete('end');
      }

      const newUrl = params.toString() ? `?${params.toString()}` : '/statistics';
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Filters */}
      <div className="flex flex-wrap items-center gap-3 justify-end">
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={handleDateFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
              <SelectItem value="1month">Last 1 Month</SelectItem>
              <SelectItem value="2months">Last 2 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {dateFilter === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                {customStartDate && customEndDate
                  ? `${customStartDate} - ${customEndDate}`
                  : 'Select dates...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Circle Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <CircleSelector
            selectedCircleId={selectedCircleId}
            onCircleChange={handleCircleChange}
            placeholder="Filter by circle..."
            showPlayerCount={true}
            size="default"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rankings">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
          <TabsTrigger value="head-to-head">Head-to-Head</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="mt-6">
          <DataErrorBoundary
            fallbackTitle="Rankings Unavailable"
            fallbackDescription="Unable to load player rankings. This may be due to a connection issue."
          >
            <RankingsClient
              initialPlayers={[]}
              selectedCircleId={selectedCircleId}
              dateFilter={dateFilter}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
            />
          </DataErrorBoundary>
        </TabsContent>

        <TabsContent value="partnerships" className="mt-6">
          <DataErrorBoundary
            fallbackTitle="Partnership Data Unavailable"
            fallbackDescription="Unable to load partnership analysis data. This may be due to a connection issue or if no games have been recorded yet."
          >
            <PartnershipsClientV2
              selectedCircleId={selectedCircleId}
              dateFilter={dateFilter}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
            />
          </DataErrorBoundary>
        </TabsContent>

        <TabsContent value="head-to-head" className="mt-6">
          <DataErrorBoundary
            fallbackTitle="Head-to-Head Data Unavailable"
            fallbackDescription="Unable to load head-to-head comparison data. This may be due to a connection issue."
          >
            <HeadToHeadClient
              selectedCircleId={selectedCircleId}
              dateFilter={dateFilter}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
            />
          </DataErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
