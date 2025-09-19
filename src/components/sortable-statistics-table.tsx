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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SortableStatisticsTableProps {
  players: Player[];
}

type SortField = 'rating' | 'wins' | 'winPercentage' | 'pointsDiff' | 'name';
type SortDirection = 'asc' | 'desc';
type StatDisplay = 'winloss' | 'winpercentage' | 'pointsdiff';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const statDisplayOptions = [
  { value: 'winloss', label: 'Win/Loss', shortLabel: 'W/L' },
  { value: 'winpercentage', label: 'Win Percentage', shortLabel: 'Win %' },
  { value: 'pointsdiff', label: 'Points Difference', shortLabel: 'Pts Diff' },
] as const;

export function SortableStatisticsTable({ players }: SortableStatisticsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'rating',
    direction: 'desc',
  });
  const [statDisplay, setStatDisplay] = useState<StatDisplay>('winloss');

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

  // Get the rank for each player based on the current sort field
  const getPlayerRank = (playerIndex: number) => {
    const field = sortConfig.field;
    
    // For stats where higher is better, use normal ranking
    // For stats where lower is better or alphabetical, adjust accordingly
    switch (field) {
      case 'rating':
      case 'wins':
      case 'winPercentage':
      case 'pointsDiff':
        // Higher values are better - if sorted ascending, reverse the rank
        return sortConfig.direction === 'asc' ? players.length - playerIndex : playerIndex + 1;
      case 'name':
        // Alphabetical - use index as is
        return playerIndex + 1;
      default:
        // Default behavior for rating (higher is better)
        return sortConfig.direction === 'asc' ? players.length - playerIndex : playerIndex + 1;
    }
  };

  // Get badge variant and styling for rank
  const getRankBadgeProps = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          variant: 'default' as const,
          className: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 p-0 flex items-center justify-center text-xs lg:text-sm bg-gradient-to-b from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 hover:bg-gradient-to-b hover:from-yellow-300 hover:to-yellow-500'
        };
      case 2:
        return {
          variant: 'default' as const,
          className: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 p-0 flex items-center justify-center text-xs lg:text-sm bg-gradient-to-b from-gray-300 to-gray-500 text-gray-800 border-gray-400 hover:bg-gradient-to-b hover:from-gray-200 hover:to-gray-400'
        };
      case 3:
        return {
          variant: 'default' as const,
          className: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 p-0 flex items-center justify-center text-xs lg:text-sm bg-gradient-to-b from-amber-600 to-amber-800 text-amber-100 border-amber-700 hover:bg-gradient-to-b hover:from-amber-500 hover:to-amber-700'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 p-0 flex items-center justify-center text-xs lg:text-sm'
        };
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-0.5 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-0.5 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-0.5 h-4 w-4" />
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

  const selectedOption = statDisplayOptions.find(opt => opt.value === statDisplay);

  const renderStatCell = (player: Player) => {
    const winPercentage = player.wins + player.losses > 0
      ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0)
      : '0';
    const pointsDiff = player.pointsFor - player.pointsAgainst;

    switch (statDisplay) {
      case 'winloss':
        return (
          <div className="font-medium text-sm sm:text-base">{player.wins} / {player.losses}</div>
        );
      case 'winpercentage':
        return (
          <div className="space-y-0.5">
            <div className="font-medium text-sm sm:text-base lg:text-lg">{winPercentage}%</div>
            <div className="text-xs text-muted-foreground">
              {player.wins} of {player.wins + player.losses}
            </div>
          </div>
        );
      case 'pointsdiff':
        return (
          <div className="space-y-0.5">
            <div className={cn(
              "font-medium text-sm sm:text-base lg:text-lg",
              pointsDiff > 0 ? 'text-green-600' : pointsDiff < 0 ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {pointsDiff > 0 ? `+${pointsDiff}` : pointsDiff}
            </div>
            <div className="text-xs text-muted-foreground">
              {player.pointsFor} - {player.pointsAgainst}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatSortField = (): SortField => {
    switch (statDisplay) {
      case 'winloss':
        return 'wins';
      case 'winpercentage':
        return 'winPercentage';
      case 'pointsdiff':
        return 'pointsDiff';
      default:
        return 'wins';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Click headers to sort • Select stat to display
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Show:
            </span>
            <Select value={statDisplay} onValueChange={(value: StatDisplay) => setStatDisplay(value)}>
              <SelectTrigger className="w-[140px] lg:w-[160px]">
                <SelectValue>
                  <span className="lg:hidden">{selectedOption?.shortLabel}</span>
                  <span className="hidden lg:inline">{selectedOption?.label}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statDisplayOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full min-w-[320px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px] sm:w-[40px] lg:w-[50px] text-center px-1 sm:px-2">
                  <span className="lg:hidden">#</span>
                  <span className="hidden lg:inline">Rank</span>
                </TableHead>
                <SortableHeader field="name" className="min-w-[120px] sm:min-w-[140px] px-2 sm:px-3 lg:px-4">
                  Player
                </SortableHeader>
                <SortableHeader field="rating" className="w-[60px] sm:w-[80px] lg:w-[100px] text-center px-1 sm:px-2">
                  <span className="lg:hidden text-xs">Rating</span>
                  <span className="hidden lg:inline">Rating</span>
                </SortableHeader>
                <SortableHeader field={getStatSortField()} className="w-[70px] sm:w-[90px] lg:w-[120px] text-center px-1 sm:px-2">
                  <span className="lg:hidden text-xs">{selectedOption?.shortLabel}</span>
                  <span className="hidden lg:inline">{selectedOption?.label}</span>
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow key={player.id}>
                  <TableCell className="text-center font-bold text-base lg:text-lg px-1 sm:px-2">
                    {(() => {
                      const rank = getPlayerRank(index);
                      const badgeProps = getRankBadgeProps(rank);
                      return (
                        <Badge variant={badgeProps.variant} className={badgeProps.className}>
                          {rank}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-3 min-w-0">
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 shrink-0">
                        <AvatarImage
                          src={player.avatar}
                          alt={player.name}
                          data-ai-hint="player avatar"
                        />
                        <AvatarFallback className="text-xs lg:text-sm">
                          {player.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        href={`/players/${player.id}`}
                        className="font-medium hover:underline text-sm sm:text-base lg:text-base truncate"
                      >
                        {player.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-center text-sm sm:text-base lg:text-base font-medium px-1 sm:px-2">
                    {player.rating.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center px-1 sm:px-2">
                    {renderStatCell(player)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {sortedPlayers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No players found</p>
            <p className="text-sm">Add some players to see statistics.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}