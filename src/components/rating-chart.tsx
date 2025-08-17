'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RatingHistoryPoint } from '@/lib/types';

interface RatingChartProps {
  ratingHistory: RatingHistoryPoint[];
  playerName: string;
}

export function RatingChart({ ratingHistory, playerName }: RatingChartProps) {
  if (!ratingHistory || ratingHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rating History (Last 30 Days)</CardTitle>
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
    rating: Math.round(point.rating * 100) / 100, // Round to 2 decimals
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Rating History (Last 30 Days)</CardTitle>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Change</p>
          <p className={`text-lg font-bold ${changeColor}`}>{changeText}</p>
        </div>
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
