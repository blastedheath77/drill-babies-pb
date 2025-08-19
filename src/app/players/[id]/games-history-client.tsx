'use client';

import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Game, Player } from '@/lib/types';

interface GamesHistoryClientProps {
  games: Game[];
  player: Player;
}

export function GamesHistoryClient({ games, player }: GamesHistoryClientProps) {
  const [gameTypeFilter, setGameTypeFilter] = React.useState<string>('Doubles');

  // Filter games based on selected type
  const filteredGames = React.useMemo(() => {
    return games.filter(game => game.type === gameTypeFilter);
  }, [games, gameTypeFilter]);

  const getPartner = (game: Game) => {
    const playerTeam = game.team1.players.some((p) => p.id === player.id)
      ? game.team1
      : game.team2;
    
    if (game.type === 'Singles') {
      return 'N/A';
    }
    
    const partner = playerTeam.players.find((p) => p.id !== player.id);
    return partner ? partner.name : 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const getRatingDisplay = (game: Game) => {
    const gameData = game as any;
    const ratingChange = gameData.ratingChanges?.[player.id];
    
    if (!ratingChange) return 'N/A';

    const change = ratingChange.after - ratingChange.before;
    const changeText = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';

    return (
      <span className={`font-mono font-medium ${changeColor}`}>
        {changeText}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Games History</CardTitle>
          <Select value={gameTypeFilter} onValueChange={setGameTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Doubles">Doubles</SelectItem>
              <SelectItem value="Singles">Singles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 px-2">Date</TableHead>
              <TableHead className="px-2">Partner</TableHead>
              <TableHead className="w-24 px-2 text-center">Score</TableHead>
              <TableHead className="w-16 px-2 text-center">Rating</TableHead>
              <TableHead className="px-2">Opponent(s)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGames.map((game) => {
              const playerTeam = game.team1.players.some((p) => p.id === player.id)
                ? game.team1
                : game.team2;
              const opponentTeam = game.team1.players.some((p) => p.id === player.id)
                ? game.team2
                : game.team1;
              const win = playerTeam.score > opponentTeam.score;

              return (
                <TableRow key={game.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="px-2 py-2 text-xs">
                    <Link href={`/games/${game.id}`} className="block">
                      {formatDate(game.date)}
                    </Link>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <Link href={`/games/${game.id}`} className="block truncate">
                      {getPartner(game)}
                    </Link>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-center">
                    <Link href={`/games/${game.id}`} className="block">
                      <span className={`inline-block px-2 py-1 rounded border-2 font-mono text-sm whitespace-nowrap ${
                        win 
                          ? 'border-blue-500 text-blue-700 bg-blue-50' 
                          : 'border-red-500 text-red-700 bg-red-50'
                      }`}>
                        {playerTeam.score} - {opponentTeam.score}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-xs text-center">
                    <Link href={`/games/${game.id}`} className="block">
                      {getRatingDisplay(game)}
                    </Link>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <Link href={`/games/${game.id}`} className="block truncate">
                      {opponentTeam.players.map((p) => p.name).join(' & ')}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filteredGames.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No {gameTypeFilter.toLowerCase()} games found for this player.
          </div>
        )}
      </CardContent>
    </Card>
  );
}