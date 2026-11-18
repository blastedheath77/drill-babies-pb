'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBoxLeague, useBoxesByLeague, usePlayerStatsByLeague } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import { useClub } from '@/contexts/club-context';

interface CycleHistoryClientProps {
  boxLeagueId: string;
}

interface CycleBoxStanding {
  playerId: string;
  boxNumber: number;
  position: number;
}

interface CycleSnapshot {
  cycleNumber: number;
  boxes: { boxNumber: number; standings: CycleBoxStanding[] }[];
}

export function CycleHistoryClient({ boxLeagueId }: CycleHistoryClientProps) {
  const { selectedClub } = useClub();
  const { data: boxLeague, isLoading: leagueLoading } = useBoxLeague(boxLeagueId);
  const { data: boxes = [], isLoading: boxesLoading } = useBoxesByLeague(boxLeagueId);
  const { data: allPlayerStats = [], isLoading: statsLoading } = usePlayerStatsByLeague(boxLeagueId);
  const { data: allPlayers = [] } = usePlayers(selectedClub?.id);

  const isLoading = leagueLoading || boxesLoading || statsLoading;

  const getPlayer = (id: string) => allPlayers.find(p => p.id === id);

  // Build cycle snapshots from positionHistory across all players
  const cycleHistory = useMemo((): CycleSnapshot[] => {
    if (!allPlayerStats.length) return [];

    // Collect all history entries and group by cycle
    const byCycle: Record<number, CycleBoxStanding[]> = {};
    for (const stats of allPlayerStats) {
      for (const h of stats.positionHistory) {
        if (!byCycle[h.cycle]) byCycle[h.cycle] = [];
        byCycle[h.cycle].push({
          playerId: stats.playerId,
          boxNumber: h.boxNumber,
          position: h.position,
        });
      }
    }

    return Object.entries(byCycle)
      .map(([cycle, standings]) => {
        const cycleNumber = parseInt(cycle);
        // Group by box
        const byBox: Record<number, CycleBoxStanding[]> = {};
        for (const s of standings) {
          if (!byBox[s.boxNumber]) byBox[s.boxNumber] = [];
          byBox[s.boxNumber].push(s);
        }
        const boxSnapshots = Object.entries(byBox)
          .map(([boxNum, bStandings]) => ({
            boxNumber: parseInt(boxNum),
            standings: bStandings.sort((a, b) => a.position - b.position),
          }))
          .sort((a, b) => a.boxNumber - b.boxNumber);
        return { cycleNumber, boxes: boxSnapshots };
      })
      .sort((a, b) => b.cycleNumber - a.cycleNumber); // Most recent first
  }, [allPlayerStats]);

  // Determine movement between cycles (compare cycle N position with cycle N+1 position)
  const getMovement = (playerId: string, cycleNumber: number): 'promotion' | 'relegation' | 'stay' | null => {
    // Find this player's entry in the next cycle (cycleNumber + 1)
    for (const stats of allPlayerStats) {
      if (stats.playerId !== playerId) continue;
      const thisCycle = stats.positionHistory.find(h => h.cycle === cycleNumber);
      const nextCycle = stats.positionHistory.find(h => h.cycle === cycleNumber + 1);
      if (!thisCycle || !nextCycle) return null;
      if (nextCycle.boxNumber < thisCycle.boxNumber) return 'promotion';
      if (nextCycle.boxNumber > thisCycle.boxNumber) return 'relegation';
      return 'stay';
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading history...</span>
      </div>
    );
  }

  if (!boxLeague) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Box league not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/box-leagues/${boxLeagueId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Cycle History</h1>
          <p className="text-muted-foreground">{boxLeague.name}</p>
        </div>
        <Badge variant={boxLeague.status === 'active' ? 'default' : 'secondary'}>
          Cycle {boxLeague.currentCycle}
        </Badge>
      </div>

      {cycleHistory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No history yet</h3>
            <p className="text-muted-foreground">
              Cycle history is recorded after each promotion/relegation. Complete the first cycle to see results here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {cycleHistory.map(cycle => (
            <div key={cycle.cycleNumber} className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                End of Cycle {cycle.cycleNumber}
              </h2>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cycle.boxes.map(box => (
                  <Card key={box.boxNumber}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Box {box.boxNumber}</span>
                        {box.boxNumber === 1 && <Badge variant="outline" className="text-xs">Top</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {box.standings.map((standing, idx) => {
                          const player = getPlayer(standing.playerId);
                          if (!player) return null;
                          const movement = getMovement(standing.playerId, cycle.cycleNumber);
                          const isFirst = idx === 0;
                          const isLast = idx === box.standings.length - 1;
                          const totalBoxes = Math.max(...cycle.boxes.map(b => b.boxNumber));
                          const isTopBox = box.boxNumber === 1;
                          const isBottomBox = box.boxNumber === totalBoxes;

                          return (
                            <div key={standing.playerId} className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                  isFirst && !isTopBox ? 'border-green-500 text-green-600 bg-green-500/10' :
                                  isLast && !isBottomBox ? 'border-red-500 text-red-600 bg-red-500/10' : ''
                                }`}
                              >
                                {idx + 1}
                              </Badge>
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={player.avatar} alt={player.name} />
                                <AvatarFallback className="text-xs">{player.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium flex-1 truncate">{player.name}</span>
                              {movement === 'promotion' && (
                                <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                              )}
                              {movement === 'relegation' && (
                                <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                              )}
                              {movement === 'stay' && (
                                <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
