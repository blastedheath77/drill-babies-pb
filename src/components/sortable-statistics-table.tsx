'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SortableStatisticsTableProps {
  players: Player[];
  showRating?: boolean; // Whether to show the rating column (only for "All Time" filter)
  initialSortField?: SortField; // Optional initial sort field
}

type SortField = 'rating' | 'wins' | 'winPercentage' | 'pointsDiff' | 'name' | 'form';
type SortDirection = 'asc' | 'desc';
type FourthStatDisplay = 'winloss' | 'pointsdiff';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const fourthStatOptions = [
  { value: 'winloss', label: 'Win/Loss', shortLabel: 'W/L' },
  { value: 'pointsdiff', label: 'Points Diff', shortLabel: 'Pts Diff' },
] as const;

export function SortableStatisticsTable({ players, showRating = true, initialSortField }: SortableStatisticsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: initialSortField || (showRating ? 'rating' : 'winPercentage'),
    direction: 'desc',
  });
  const [fourthStat, setFourthStat] = useState<FourthStatDisplay>('winloss');

  // Update sort when initialSortField changes (e.g., when date filter changes)
  useEffect(() => {
    if (initialSortField) {
      setSortConfig({
        field: initialSortField,
        direction: 'desc',
      });
    }
  }, [initialSortField]);

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
        case 'form':
          aValue = (a as any).form?.score ?? 50;
          bValue = (b as any).form?.score ?? 50;
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
      case 'form':
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

  const selectedOption = fourthStatOptions.find(opt => opt.value === fourthStat);

  const renderFourthStatCell = (player: Player) => {
    const pointsDiff = player.pointsFor - player.pointsAgainst;

    switch (fourthStat) {
      case 'winloss':
        return (
          <div className="font-medium text-sm sm:text-base">{player.wins} / {player.losses}</div>
        );
      case 'pointsdiff':
        return (
          <div className={cn(
            "font-medium text-sm sm:text-base",
            pointsDiff > 0 ? 'text-green-600' : pointsDiff < 0 ? 'text-red-600' : 'text-muted-foreground'
          )}>
            {pointsDiff > 0 ? `+${pointsDiff}` : pointsDiff}
          </div>
        );
      default:
        return null;
    }
  };

  const getFourthStatSortField = (): SortField => {
    switch (fourthStat) {
      case 'winloss':
        return 'wins';
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
              Click headers to sort
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              4th Column:
            </span>
            <Select value={fourthStat} onValueChange={(value: FourthStatDisplay) => setFourthStat(value)}>
              <SelectTrigger className="w-[120px] lg:w-[140px]">
                <SelectValue>
                  <span className="lg:hidden">{selectedOption?.shortLabel}</span>
                  <span className="hidden lg:inline">{selectedOption?.label}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fourthStatOptions.map((option) => (
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
                <TableHead className="w-[40px] sm:w-[50px] text-center px-1 sm:px-2">
                  <span className="text-xs sm:text-sm">#</span>
                </TableHead>
                <SortableHeader field="name" className="min-w-[100px] sm:min-w-[120px] px-2 sm:px-3">
                  Player
                </SortableHeader>
                {showRating && (
                  <SortableHeader field="rating" className="w-[60px] sm:w-[70px] text-center px-1 sm:px-2">
                    <span className="text-xs sm:text-sm">Rating</span>
                  </SortableHeader>
                )}
                <SortableHeader field="winPercentage" className="w-[60px] sm:w-[70px] text-center px-1 sm:px-2">
                  <span className="text-xs sm:text-sm">Win %</span>
                </SortableHeader>
                <SortableHeader field="form" className="w-[60px] sm:w-[70px] text-center px-1 sm:px-2">
                  <span className="text-xs sm:text-sm">Form</span>
                </SortableHeader>
                <SortableHeader field={getFourthStatSortField()} className="w-[70px] sm:w-[80px] text-center px-1 sm:px-2">
                  <span className="text-xs sm:text-sm">{selectedOption?.shortLabel}</span>
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => {
                const rank = getPlayerRank(index);
                const badgeProps = getRankBadgeProps(rank);
                const winPercentage = player.wins + player.losses > 0
                  ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0)
                  : '0';
                const form = (player as any).form;
                const formScore = form?.score ?? 50;
                const formColorClass = formScore >= 65
                  ? 'text-green-600'
                  : formScore <= 35
                  ? 'text-red-600'
                  : 'text-yellow-600';

                // Format name based on whether rating column is shown
                const displayName = showRating
                  ? (() => {
                      const parts = player.name.trim().split(/\s+/);
                      if (parts.length === 1) return player.name;
                      const firstName = parts[0];
                      const lastName = parts.slice(1).join(' ');
                      return `${firstName.charAt(0)}. ${lastName}`;
                    })()
                  : player.name;

                return (
                  <TableRow key={player.id}>
                    <TableCell className="text-center font-bold text-sm sm:text-base px-1 sm:px-2">
                      <Badge variant={badgeProps.variant} className={badgeProps.className}>
                        {rank}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 sm:p-3">
                      <Link
                        href={`/players/${player.id}`}
                        className="font-medium hover:underline text-sm sm:text-base truncate"
                        title={player.name}
                      >
                        {displayName}
                      </Link>
                    </TableCell>
                    {showRating && (
                      <TableCell className="font-mono text-center text-sm sm:text-base font-medium px-1 sm:px-2">
                        {player.rating.toFixed(2)}
                      </TableCell>
                    )}
                    <TableCell className="text-center text-sm sm:text-base font-medium px-1 sm:px-2">
                      {winPercentage}%
                    </TableCell>
                    <TableCell className="text-center px-1 sm:px-2">
                      <div className={cn("text-sm sm:text-base font-bold", formColorClass)}>
                        {formScore}
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-1 sm:px-2">
                      {renderFourthStatCell(player)}
                    </TableCell>
                  </TableRow>
                );
              })}
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