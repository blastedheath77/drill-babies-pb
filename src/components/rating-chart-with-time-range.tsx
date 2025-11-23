'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePlayerRatingHistory } from '@/hooks/use-players';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { RatingHistoryPoint } from '@/lib/types';

interface RatingChartWithTimeRangeProps {
  playerId: string;
  playerName: string;
}

type TimeRange = 7 | 14 | 30 | 60 | 365 | 'custom';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function RatingChartWithTimeRange({ playerId, playerName }: RatingChartWithTimeRangeProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Calculate days for custom range
  const getDaysFromDateRange = (): number => {
    if (dateRange.from && dateRange.to) {
      const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 30; // Default fallback
  };

  const days = timeRange === 'custom' ? getDaysFromDateRange() : timeRange;
  const { data: ratingHistory = [], isLoading } = usePlayerRatingHistory(playerId, days);

  const getTimeRangeLabel = () => {
    if (timeRange === 'custom' && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }
    const labels: Record<Exclude<TimeRange, 'custom'>, string> = {
      7: 'Last 7 Days',
      14: 'Last 14 Days',
      30: 'Last 30 Days',
      60: 'Last 60 Days',
      365: 'Last Year',
    };
    return timeRange === 'custom' ? 'Custom Range' : labels[timeRange];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rating History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading rating history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ratingHistory || ratingHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Rating History ({getTimeRangeLabel()})</CardTitle>
            <TimeRangeSelector
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No rating history available. Play some games to see your rating progression!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Format data for the chart
  const chartData = ratingHistory.map((point, index) => ({
    date: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    rating: Math.round(point.rating * 100) / 100,
    fullDate: point.date,
    opponent: point.opponent,
    gameId: point.gameId,
    index,
  }));

  // Calculate rating change
  const firstRating = ratingHistory[0]?.rating || 0;
  const lastRating = ratingHistory[ratingHistory.length - 1]?.rating || 0;
  const ratingChange = lastRating - firstRating;
  const changeText = ratingChange >= 0 ? `+${ratingChange.toFixed(2)}` : ratingChange.toFixed(2);
  const changeColor = ratingChange >= 0 ? 'text-green-600' : 'text-red-600';

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Rating: ${payload[0].value.toFixed(2)}`}</p>
          <p className="text-sm text-gray-600">{`Date: ${label}`}</p>
          {data.opponent !== 'Current Rating' && data.opponent !== 'Starting Rating' && (
            <p className="text-sm text-gray-600">{data.opponent}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center justify-between sm:justify-start flex-1">
          <CardTitle>Rating History ({getTimeRangeLabel()})</CardTitle>
          <div className="text-right sm:ml-4">
            <p className="text-sm text-muted-foreground">Change</p>
            <p className={`text-lg font-bold ${changeColor}`}>{changeText}</p>
          </div>
        </div>
        <TimeRangeSelector
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['dataMin - 0.2', 'dataMax + 0.2']}
                fontSize={12}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#2563eb' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Shows rating progression after each game. Hover over points for details.</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimeRangeSelectorProps {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

function TimeRangeSelector({ timeRange, setTimeRange, dateRange, setDateRange }: TimeRangeSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const timeRangeOptions: { value: Exclude<TimeRange, 'custom'>; label: string }[] = [
    { value: 7, label: '7d' },
    { value: 14, label: '14d' },
    { value: 30, label: '30d' },
    { value: 60, label: '60d' },
    { value: 365, label: '1y' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {timeRangeOptions.map((option) => (
        <Button
          key={option.value}
          variant={timeRange === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(option.value)}
        >
          {option.label}
        </Button>
      ))}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={timeRange === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('custom')}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Custom
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">From Date</label>
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">To Date</label>
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                  disabled={(date) => date > new Date() || (dateRange.from ? date < dateRange.from : false)}
                />
              </div>
              <Button
                onClick={() => setCalendarOpen(false)}
                disabled={!dateRange.from || !dateRange.to}
                className="w-full"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
