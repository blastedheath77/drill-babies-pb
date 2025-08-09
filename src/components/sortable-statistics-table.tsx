'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import type { Player } from '@/lib/types';

interface SortableStatisticsTableProps {
  players: Player[];
}

type SortField = 'rating' | 'wins' | 'winPercentage' | 'pointsDiff' | 'name';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export function SortableStatisticsTable({ players }: SortableStatisticsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'rating',
    direction: 'desc',
  });

  const sortedPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.field) {
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'wins':
          aValue = a.wins;
          bValue = b.wins;
          break;
        case 'winPercentage':
          aValue = a.wins + a.losses > 0 ? (a.wins / (a.wins + a.losses)) * 100 : 0;
          bValue = b.wins + b.losses > 0 ? (b.wins / (b.wins + b.losses)) * 100 : 0;
          break;
        case 'pointsDiff':
          aValue = a.pointsFor - a.pointsAgainst;
          bValue = b.pointsFor - b.pointsAgainst;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          aValue = a.rating;
          bValue = b.rating;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [players, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortConfig.field === field;
    return (
      <TableHead className={className}>
        <Button
          variant="ghost"
          onClick={() => handleSort(field)}
          className={`h-auto p-0 font-semibold hover:bg-transparent hover:text-foreground ${
            isActive ? 'text-primary' : ''
          }`}
        >
          {children}
          {getSortIcon(field)}
        </Button>
      </TableHead>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Player Leaderboard</CardTitle>
        <p className="text-sm text-muted-foreground">
          Click column headers to sort by different metrics
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <SortableHeader field="name">Player</SortableHeader>
              <SortableHeader field="rating">Rating</SortableHeader>
              <SortableHeader field="wins">Win/Loss</SortableHeader>
              <SortableHeader field="winPercentage">Win %</SortableHeader>
              <SortableHeader field="pointsDiff">Points Diff.</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayers.map((player, index) => {
              const winPercentage =
                player.wins + player.losses > 0
                  ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0)
                  : '0';
              const pointsDiff = player.pointsFor - player.pointsAgainst;
              
              return (
                <TableRow key={player.id}>
                  <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={player.avatar}
                          alt={player.name}
                          data-ai-hint="player avatar"
                        />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Link
                        href={`/players/${player.id}`}
                        className="font-medium hover:underline"
                      >
                        {player.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-base">
                    {player.rating.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{player.wins} / {player.losses}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.wins + player.losses} games
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {winPercentage}%
                  </TableCell>
                  <TableCell
                    className={`font-medium ${pointsDiff > 0 ? 'text-green-600' : pointsDiff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                  >
                    {pointsDiff > 0 ? `+${pointsDiff}` : pointsDiff}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {sortedPlayers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No players found. Add some players to see statistics.
          </div>
        )}
      </CardContent>
    </Card>
  );
}