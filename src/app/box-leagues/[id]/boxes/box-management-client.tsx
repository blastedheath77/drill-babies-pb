'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Plus, Trash2, UserPlus, UserMinus, Loader2, AlertTriangle, GripVertical, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SwapPlayersDialog } from '@/components/box-leagues/swap-players-dialog';
import { useBoxLeague, useBoxesByLeague, useCreateBox, useUpdateBox } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import type { Box, Player } from '@/lib/types';

interface BoxManagementClientProps {
  boxLeagueId: string;
}

interface DraggedPlayer {
  player: Player;
  sourceBoxId?: string;
  sourcePosition?: number;
}

interface PlayerCardProps {
  player: Player;
  position: number;
  boxId: string;
  onDragStart: (e: React.DragEvent, player: Player, sourceBoxId: string, position: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetPlayer: Player, targetBoxId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onRemovePlayer?: (boxId: string, playerId: string) => void;
  isDragging?: boolean;
  isBeingDragged?: boolean;
  isDropTarget?: boolean;
}

function PlayerCard({ player, position, boxId, onDragStart, onDragEnd, onDrop, onDragOver, onDragLeave, onRemovePlayer, isDragging, isBeingDragged, isDropTarget }: PlayerCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, player, boxId, position);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e, player, boxId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragLeave(e);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-move transition-all duration-200 ${
        isBeingDragged
          ? 'opacity-50 scale-95 bg-secondary/20'
          : isDropTarget
          ? 'bg-primary/20 border-2 border-primary border-dashed scale-[1.02]'
          : 'bg-secondary/30 hover:bg-secondary/50 hover:scale-[1.02]'
      } ${isDragging && !isBeingDragged ? 'hover:shadow-lg' : ''}`}
    >
      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
        {position + 1}
      </Badge>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={player.avatar} alt={player.name} />
        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{player.name}</div>
        <div className="text-sm text-muted-foreground">
          Rating: {player.rating.toFixed(2)}
        </div>
      </div>
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      {onRemovePlayer && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemovePlayer(boxId, player.id);
          }}
          className="ml-2"
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface DropZoneProps {
  boxId: string;
  onDrop: (e: React.DragEvent, targetBoxId: string) => void;
  onDragOver: (e: React.DragEvent, targetBoxId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onAddPlayer: (boxId: string, playerId: string) => void;
  isEmpty: boolean;
  isOver?: boolean;
  isDragging?: boolean;
  availablePlayers: Player[];
}

function DropZone({ boxId, onDrop, onDragOver, onDragLeave, onAddPlayer, isEmpty, isOver, isDragging, availablePlayers }: DropZoneProps) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, boxId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e, boxId);
  };

  const handlePlayerSelect = (playerId: string) => {
    onAddPlayer(boxId, playerId);
    setIsPopoverOpen(false);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg transition-all duration-200 ${
        isEmpty ? 'mt-0' : 'mt-3'
      } ${
        isOver
          ? 'border-primary bg-primary/10 scale-[1.02]'
          : isDragging
          ? 'border-muted-foreground/50 hover:border-muted-foreground/70'
          : isEmpty
          ? 'border-muted-foreground/30 hover:border-muted-foreground/50'
          : 'border-muted-foreground/20 hover:border-muted-foreground/30'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="p-6 text-center text-muted-foreground">
        <Users className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm mb-3">{isEmpty ? 'No players assigned' : 'Drop player here'}</p>
        <p className="text-xs mb-4">Drag players from unassigned list or other boxes</p>

        {availablePlayers.length > 0 && (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Or click to select
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="center">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Select a player to add:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availablePlayers.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => handlePlayerSelect(player.id)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.avatar} alt={player.name} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Rating: {player.rating.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

interface UnassignedPlayerProps {
  player: Player;
  onDragStart: (e: React.DragEvent, player: Player) => void;
  onDragEnd: () => void;
  isBeingDragged?: boolean;
  isDragging?: boolean;
}

function UnassignedPlayer({ player, onDragStart, onDragEnd, isBeingDragged, isDragging }: UnassignedPlayerProps) {
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, player);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-move transition-all duration-200 ${
        isBeingDragged
          ? 'opacity-50 scale-95 bg-secondary/20'
          : 'bg-secondary/30 hover:bg-secondary/50 hover:scale-[1.02]'
      } ${isDragging && !isBeingDragged ? 'hover:shadow-lg' : ''}`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={player.avatar} alt={player.name} />
        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{player.name}</div>
        <div className="text-sm text-muted-foreground">
          Rating: {player.rating.toFixed(2)}
        </div>
      </div>
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export function BoxManagementClient({ boxLeagueId }: BoxManagementClientProps) {
  const { data: boxLeague, isLoading: leagueLoading } = useBoxLeague(boxLeagueId);
  const { data: boxes = [], isLoading: boxesLoading, refetch: refetchBoxes } = useBoxesByLeague(boxLeagueId);
  const { data: allPlayers = [], isLoading: playersLoading } = usePlayers();
  const createBox = useCreateBox();
  const updateBox = useUpdateBox();

  const [draggedPlayer, setDraggedPlayer] = useState<DraggedPlayer | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Swap dialog state
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapData, setSwapData] = useState<{
    player1: Player;
    box1: Box;
    player2: Player;
    box2: Box;
  } | null>(null);

  const isLoading = leagueLoading || boxesLoading || playersLoading;

  const handleDragStart = (e: React.DragEvent, player: Player, sourceBoxId?: string, sourcePosition?: number) => {
    setDraggedPlayer({ player, sourceBoxId, sourcePosition });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', player.id);
  };

  const handleDragOver = (e: React.DragEvent, targetBoxId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetBoxId);
  };

  const handlePlayerDragOver = (e: React.DragEvent, targetPlayerId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPlayer(targetPlayerId || null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the actual drop zone, not child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null);
    }
  };

  const handlePlayerDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverPlayer(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setDragOverTarget(null);
    setDragOverPlayer(null);
    setIsDragging(false);
  };

  const handlePlayerDrop = async (e: React.DragEvent, targetPlayer: Player, targetBoxId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPlayer(null);
    setIsDragging(false);

    if (!draggedPlayer || !draggedPlayer.sourceBoxId) return;

    const { player: draggedPlayerData, sourceBoxId } = draggedPlayer;

    // Don't allow dropping on the same player
    if (draggedPlayerData.id === targetPlayer.id) return;

    const sourceBox = boxes.find(b => b.id === sourceBoxId);
    const targetBox = boxes.find(b => b.id === targetBoxId);

    if (!sourceBox || !targetBox) return;

    // Open swap dialog with impact analysis
    setSwapData({
      player1: draggedPlayerData,
      box1: sourceBox,
      player2: targetPlayer,
      box2: targetBox,
    });
    setSwapDialogOpen(true);
    setDraggedPlayer(null);
  };

  const handleDrop = async (e: React.DragEvent, targetBoxId: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    setIsDragging(false);

    if (!draggedPlayer) return;

    const { player, sourceBoxId, sourcePosition } = draggedPlayer;
    const targetBox = boxes.find(b => b.id === targetBoxId);

    if (!targetBox) return;

    try {
      // If moving from unassigned players
      if (!sourceBoxId) {
        // Add player to target box
        const newPlayerIds = [...targetBox.playerIds];
        if (newPlayerIds.length >= 4) {
          alert('Box is full (maximum 4 players)');
          return;
        }
        newPlayerIds.push(player.id);

        await updateBox.mutateAsync({
          id: targetBoxId,
          updates: {
            playerIds: newPlayerIds
          }
        });
      }
      // If moving from one box to another
      else if (sourceBoxId !== targetBoxId) {
        const sourceBox = boxes.find(b => b.id === sourceBoxId);
        if (!sourceBox) return;

        if (targetBox.playerIds.length >= 4) {
          alert('Target box is full (maximum 4 players)');
          return;
        }

        // Remove from source box
        const sourcePlayerIds = sourceBox.playerIds.filter(id => id !== player.id);

        // Add to target box
        const targetPlayerIds = [...targetBox.playerIds, player.id];

        // Update both boxes
        await Promise.all([
          updateBox.mutateAsync({
            id: sourceBoxId,
            updates: {
              playerIds: sourcePlayerIds
            }
          }),
          updateBox.mutateAsync({
            id: targetBoxId,
            updates: {
              playerIds: targetPlayerIds
            }
          })
        ]);
      }
      // If reordering within same box (we'll implement this later if needed)
      else {
        // For now, just return since we're using a simpler model
        return;
      }
    } catch (error) {
      console.error('Error moving player:', error);
      alert('Failed to move player. Please try again.');
    } finally {
      setDraggedPlayer(null);
      // Force refetch to ensure UI is in sync
      refetchBoxes();
    }
  };

  const addPlayerToBox = async (boxId: string, playerId: string) => {
    const targetBox = boxes.find(b => b.id === boxId);
    if (!targetBox) return;

    // Check if box is full
    if (targetBox.playerIds.length >= 4) {
      alert('Box is full (maximum 4 players)');
      return;
    }

    // Check if player is already in this box
    if (targetBox.playerIds.includes(playerId)) {
      alert('Player is already in this box');
      return;
    }

    // Check if player is in another box
    const existingBox = boxes.find(b => b.playerIds.includes(playerId));
    if (existingBox) {
      alert(`Player is already in Box ${existingBox.boxNumber}`);
      return;
    }

    try {
      await updateBox.mutateAsync({
        id: boxId,
        updates: {
          playerIds: [...targetBox.playerIds, playerId]
        }
      });
      // Force refetch to ensure UI is in sync
      refetchBoxes();
    } catch (error) {
      console.error('Error adding player to box:', error);
      alert('Failed to add player. Please try again.');
    }
  };

  const removePlayerFromBox = async (boxId: string, playerId: string) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    try {
      await updateBox.mutateAsync({
        id: boxId,
        updates: {
          playerIds: box.playerIds.filter(id => id !== playerId)
        }
      });
      // Force refetch to ensure UI is in sync
      refetchBoxes();
    } catch (error) {
      console.error('Error removing player from box:', error);
    }
  };

  const getPlayerById = (playerId: string): Player | undefined => {
    return allPlayers.find(p => p.id === playerId);
  };

  const getAvailablePlayers = (): Player[] => {
    const assignedPlayerIds = new Set(boxes.flatMap(box => box.playerIds));
    return allPlayers.filter(player => !assignedPlayerIds.has(player.id));
  };

  const getSortedAvailablePlayers = (): Player[] => {
    const available = getAvailablePlayers();
    // Sort by rating descending (highest rated first)
    return available.sort((a, b) => b.rating - a.rating);
  };

  const getTotalAssignedPlayers = (): number => {
    return boxes.reduce((total, box) => total + box.playerIds.length, 0);
  };

  const getTotalNeededPlayers = (): number => {
    return boxLeague ? boxLeague.totalBoxes * 4 : 0;
  };

  const canStartLeague = (): boolean => {
    return boxes.every(box => box.playerIds.length === 4);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading box management...</span>
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

  const availablePlayers = getSortedAvailablePlayers();
  const totalAssigned = getTotalAssignedPlayers();
  const totalNeeded = getTotalNeededPlayers();

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
          <h1 className="text-3xl font-bold">Manage Boxes</h1>
          <p className="text-muted-foreground">{boxLeague.name}</p>
        </div>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Setup Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Players Assigned:</span>
              <div className="font-semibold text-lg">{totalAssigned} / {totalNeeded}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Boxes Created:</span>
              <div className="font-semibold text-lg">{boxes.length} / {boxLeague.totalBoxes}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Available Players:</span>
              <div className="font-semibold text-lg">{availablePlayers.length}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <div className="font-semibold text-lg">
                {canStartLeague() ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ready</Badge>
                ) : (
                  <Badge variant="secondary">Setup Needed</Badge>
                )}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Unassigned Players */}
      {availablePlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Unassigned Players
              <Badge variant="secondary">{availablePlayers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {availablePlayers.map(player => (
                <UnassignedPlayer
                  key={player.id}
                  player={player}
                  onDragStart={(e, player) => handleDragStart(e, player)}
                  onDragEnd={handleDragEnd}
                  isBeingDragged={draggedPlayer?.player.id === player.id}
                  isDragging={isDragging}
                />
              ))}
            </div>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
              <GripVertical className="h-4 w-4 mx-auto mb-2" />
              Drag players from here into box slots below
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boxes Grid */}
      <div className="grid gap-6">
        {boxes
          .sort((a, b) => a.boxNumber - b.boxNumber)
          .map((box) => (
          <Card key={box.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Box {box.boxNumber}
                  {box.boxNumber === 1 && <Badge variant="outline">Top Box</Badge>}
                  {box.boxNumber === boxLeague.totalBoxes && <Badge variant="outline">Bottom Box</Badge>}
                </CardTitle>
                <Badge variant={box.playerIds.length === 4 ? 'default' : 'secondary'}>
                  {box.playerIds.length} / 4 players
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {box.playerIds.length === 0 ? (
                <DropZone
                  boxId={box.id}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onAddPlayer={addPlayerToBox}
                  isEmpty={true}
                  isOver={dragOverTarget === box.id}
                  isDragging={isDragging}
                  availablePlayers={availablePlayers}
                />
              ) : (
                <div className="space-y-3">
                  {box.playerIds.map((playerId, index) => {
                    const player = getPlayerById(playerId);
                    return player ? (
                      <PlayerCard
                        key={playerId}
                        player={player}
                        position={index}
                        boxId={box.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDrop={handlePlayerDrop}
                        onDragOver={(e) => handlePlayerDragOver(e, player.id)}
                        onDragLeave={handlePlayerDragLeave}
                        onRemovePlayer={removePlayerFromBox}
                        isBeingDragged={draggedPlayer?.player.id === player.id && draggedPlayer?.sourceBoxId === box.id}
                        isDragging={isDragging}
                        isDropTarget={dragOverPlayer === player.id}
                      />
                    ) : null;
                  })}

                  {box.playerIds.length < 4 && (
                    <DropZone
                      boxId={box.id}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onAddPlayer={addPlayerToBox}
                      isEmpty={false}
                      isOver={dragOverTarget === box.id}
                      isDragging={isDragging}
                      availablePlayers={availablePlayers}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Messages */}
      {totalAssigned === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No players have been assigned to boxes yet. Add players to get started.
          </AlertDescription>
        </Alert>
      )}

      {!canStartLeague() && totalAssigned > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            All boxes need exactly 4 players before you can start the league.
            Currently missing {totalNeeded - totalAssigned} players.
          </AlertDescription>
        </Alert>
      )}

      {canStartLeague() && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <AlertTriangle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Ready to start!</strong> All boxes have 4 players assigned.
            You can now start the first round of the league.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href={`/box-leagues/${boxLeagueId}`}>Back to League</Link>
        </Button>
        {canStartLeague() && (
          <Button asChild>
            <Link href={`/box-leagues/${boxLeagueId}/rounds`}>
              Start First Round
            </Link>
          </Button>
        )}
      </div>

      {/* Swap Players Dialog */}
      {swapData && (
        <SwapPlayersDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          boxLeagueId={boxLeagueId}
          player1={swapData.player1}
          box1={swapData.box1}
          player2={swapData.player2}
          box2={swapData.box2}
        />
      )}
    </div>
  );
}