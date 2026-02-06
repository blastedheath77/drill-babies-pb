'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Play, CheckCircle, Users, Trophy, Loader2, AlertTriangle, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScoreSelector } from '@/components/ui/score-selector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EditMatchResultDialog } from '@/components/box-leagues/edit-match-result-dialog';
import { useBoxLeague, useBoxesByLeague, useRoundsByLeague, useMatchesByRound, useUpdateBoxLeagueMatch, useDeleteRound } from '@/hooks/use-box-leagues';
import { usePlayers } from '@/hooks/use-players';
import { useClub } from '@/contexts/club-context';
import { createNewRound, updatePlayerStatsAfterMatch } from '@/lib/box-league-logic';
import { ScoreConfirmationDialog } from '@/components/score-confirmation-dialog';
import type { BoxLeagueMatch, Player } from '@/lib/types';

interface RoundManagementClientProps {
  boxLeagueId: string;
}

interface MatchResultDialogProps {
  match: BoxLeagueMatch;
  players: Player[];
  onSubmit: (matchId: string, team1Score: number, team2Score: number) => void;
  isLoading: boolean;
}

function MatchResultDialog({ match, players, onSubmit, isLoading }: MatchResultDialogProps) {
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown';
  };

  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const handleSubmit = () => {
    if (team1Score === team2Score) {
      alert('Games cannot end in a tie. One team must win.');
      return;
    }

    if (team1Score < 0 || team2Score < 0) {
      alert('Scores cannot be negative.');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    onSubmit(match.id, team1Score, team2Score);
    setShowConfirmDialog(false);
    setIsOpen(false);
    setTeam1Score(0);
    setTeam2Score(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          Record Result
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Match Result</DialogTitle>
          <DialogDescription>
            Enter the final scores for this match
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team 1</Label>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="font-medium">
                  {match.team1PlayerIds.map(id => getPlayerName(id)).join(' & ')}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="team1Score">Score</Label>
                <div className="flex justify-center">
                  <ScoreSelector
                    value={team1Score}
                    onChange={setTeam1Score}
                    maxScore={15}
                    align="center"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Team 2</Label>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="font-medium">
                  {match.team2PlayerIds.map(id => getPlayerName(id)).join(' & ')}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="team2Score">Score</Label>
                <div className="flex justify-center">
                  <ScoreSelector
                    value={team2Score}
                    onChange={setTeam2Score}
                    maxScore={15}
                    align="center"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Result'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Score Confirmation Dialog */}
      <ScoreConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmSubmit}
        gameType={match.team1PlayerIds.length > 1 ? 'doubles' : 'singles'}
        team1Players={match.team1PlayerIds.map(id => getPlayer(id)).filter(Boolean) as Player[]}
        team2Players={match.team2PlayerIds.map(id => getPlayer(id)).filter(Boolean) as Player[]}
        team1Score={team1Score}
        team2Score={team2Score}
      />
    </Dialog>
  );
}

export function RoundManagementClient({ boxLeagueId }: RoundManagementClientProps) {
  const { selectedClub } = useClub();
  const { data: boxLeague, isLoading: leagueLoading, refetch: refetchBoxLeague } = useBoxLeague(boxLeagueId);
  const { data: boxes = [], isLoading: boxesLoading } = useBoxesByLeague(boxLeagueId);
  const { data: rounds = [], isLoading: roundsLoading, refetch: refetchRounds } = useRoundsByLeague(boxLeagueId);
  const { data: allPlayers = [] } = usePlayers(selectedClub?.id);
  const updateMatch = useUpdateBoxLeagueMatch();
  const deleteRound = useDeleteRound();

  const [isCreatingRound, setIsCreatingRound] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editMatchDialogOpen, setEditMatchDialogOpen] = useState(false);
  const [editMatchData, setEditMatchData] = useState<BoxLeagueMatch | null>(null);

  const isLoading = leagueLoading || boxesLoading || roundsLoading;

  const canStartNewRound = (): boolean => {
    if (!boxLeague) return false;
    return boxes.every(box => box.playerIds.length === 4);
  };

  const handleCreateNewRound = async () => {
    if (!boxLeague) return;

    setIsCreatingRound(true);
    try {
      await createNewRound(boxLeague.id);
      // Force refetch to ensure UI updates
      await Promise.all([
        refetchBoxLeague(),
        refetchRounds()
      ]);
      console.log('Round created successfully!');
    } catch (error) {
      console.error('Error creating new round:', error);
      alert(`Failed to create new round: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsCreatingRound(false);
    }
  };

  const handleDeleteRound = async () => {
    if (!boxLeague || !currentRound) return;

    try {
      await deleteRound.mutateAsync({
        roundId: currentRound.id,
        boxLeagueId: boxLeague.id
      });

      setIsDeleteDialogOpen(false);
      alert('Round deleted successfully!');
    } catch (error) {
      console.error('Error deleting round:', error);
      alert(`Failed to delete round: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handleMatchResult = async (matchId: string, team1Score: number, team2Score: number) => {
    try {
      // Find the match
      const match = allMatches.find(m => m.id === matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Determine winner
      const winnerTeamPlayerIds = team1Score > team2Score
        ? match.team1PlayerIds
        : match.team2PlayerIds;

      // Update match with result
      await updateMatch.mutateAsync({
        id: matchId,
        updates: {
          team1Score,
          team2Score,
          winnerTeamPlayerIds,
          status: 'completed',
          date: new Date().toISOString()
        },
        match: match // Pass match data so hook can invalidate correct queries
      });

      // Create the updated match object for stats calculation
      const completedMatch: BoxLeagueMatch = {
        ...match,
        team1Score,
        team2Score,
        winnerTeamPlayerIds,
        status: 'completed',
        date: new Date().toISOString()
      };

      // Update player stats based on match result
      console.log('Updating player stats after match...');
      await updatePlayerStatsAfterMatch(completedMatch);
      console.log('Player stats updated successfully!');

      // No need to manually refetch - mutation hook will invalidate queries automatically

    } catch (error) {
      console.error('Error updating match result:', error);
      alert('Failed to save match result. Please try again.');
    }
  };

  const handleEditMatch = (match: BoxLeagueMatch) => {
    setEditMatchData(match);
    setEditMatchDialogOpen(true);
  };

  // Get all matches for current round
  const currentRound = rounds.find(r => r.roundNumber === boxLeague?.currentRound);
  const { data: allMatches = [] } = useMatchesByRound(currentRound?.id || '');

  const getPlayerName = (playerId: string) => {
    return allPlayers.find(p => p.id === playerId)?.name || 'Unknown';
  };

  const getMatchesByBox = (boxId: string) => {
    return allMatches.filter(m => m.boxId === boxId);
  };

  const getPendingMatchesCount = () => {
    return allMatches.filter(m => m.status === 'pending').length;
  };

  const getCompletedMatchesCount = () => {
    return allMatches.filter(m => m.status === 'completed').length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading rounds...</span>
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
          <h1 className="text-3xl font-bold">Rounds & Matches</h1>
          <p className="text-muted-foreground">{boxLeague.name}</p>
        </div>
      </div>

      {/* Round Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current Cycle:</span>
              <div className="font-semibold text-lg">{boxLeague.currentCycle}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Current Round:</span>
              <div className="font-semibold text-lg">
                {boxLeague.currentRound === 0 ? 'Not Started' : `${boxLeague.currentRound} of ${boxLeague.roundsPerCycle}`}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Pending Matches:</span>
              <div className="font-semibold text-lg">{getPendingMatchesCount()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Completed Matches:</span>
              <div className="font-semibold text-lg">{getCompletedMatchesCount()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Check */}
      {!canStartNewRound() && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            All boxes need exactly 4 players before you can start rounds.{' '}
            <Link href={`/box-leagues/${boxLeagueId}/boxes`} className="underline">
              Set up boxes first
            </Link>.
          </AlertDescription>
        </Alert>
      )}

      {/* No Rounds Yet */}
      {boxLeague.currentRound === 0 && canStartNewRound() && (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Ready to Start!</h3>
            <p className="text-muted-foreground mb-4">
              All boxes have 4 players assigned. You can now start the first round.
            </p>
            <Button onClick={handleCreateNewRound} disabled={isCreatingRound}>
              {isCreatingRound ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Round...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start First Round
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Round Matches */}
      {boxLeague.currentRound > 0 && currentRound && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Round {boxLeague.currentRound} Matches
            </h2>
            <div className="flex gap-2">
              {boxLeague.status !== 'completed' && (
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Round
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Round {boxLeague.currentRound}?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="mb-4">
                        Are you sure you want to delete Round {boxLeague.currentRound}? This action cannot be undone.
                      </p>
                      {getPendingMatchesCount() < allMatches.length && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Cannot delete this round: {allMatches.length - getPendingMatchesCount()} match(es) have been completed.
                            Only rounds with no completed matches can be deleted.
                          </AlertDescription>
                        </Alert>
                      )}
                      {getPendingMatchesCount() === allMatches.length && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            This will delete all {allMatches.length} matches in this round.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteRound}
                        disabled={getPendingMatchesCount() < allMatches.length || deleteRound.isPending}
                      >
                        {deleteRound.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Round'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {getPendingMatchesCount() === 0 && boxLeague.currentRound < boxLeague.roundsPerCycle && (
                <Button onClick={handleCreateNewRound} disabled={isCreatingRound}>
                  {isCreatingRound ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Start Next Round
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Matches by Box */}
          <div className="grid gap-6">
            {boxes
              .sort((a, b) => a.boxNumber - b.boxNumber)
              .map((box) => {
                const boxMatches = getMatchesByBox(box.id);
                return (
                  <Card key={box.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Box {box.boxNumber} Matches</span>
                        <Badge variant={boxMatches.every(m => m.status === 'completed') ? 'default' : 'secondary'}>
                          {boxMatches.filter(m => m.status === 'completed').length} / {boxMatches.length} completed
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {boxMatches
                          .sort((a, b) => a.matchNumber - b.matchNumber)
                          .map((match) => (
                          <div key={match.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary/50 rounded-lg gap-3">
                            <div className="flex-1">
                              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                  {match.matchNumber}
                                </Badge>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm sm:text-base break-words">
                                    <span className="block sm:inline">{match.team1PlayerIds.map(id => getPlayerName(id)).join(' & ')}</span>
                                    <span className="text-muted-foreground mx-1"> vs </span>
                                    <span className="block sm:inline">{match.team2PlayerIds.map(id => getPlayerName(id)).join(' & ')}</span>
                                  </div>
                                  {match.status === 'completed' && (
                                    <div className="text-sm text-muted-foreground">
                                      Score: {match.team1Score} - {match.team2Score}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {match.status === 'completed' ? (
                                <>
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditMatch(match)}
                                    title="Edit result"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <MatchResultDialog
                                  match={match}
                                  players={allPlayers}
                                  onSubmit={handleMatchResult}
                                  isLoading={updateMatch.isPending}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Round Complete Message */}
          {getPendingMatchesCount() === 0 && allMatches.length > 0 && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Round {boxLeague.currentRound} Complete!</strong>{' '}
                {boxLeague.currentRound < boxLeague.roundsPerCycle
                  ? 'You can now start the next round.'
                  : 'This cycle is complete. Promotion/relegation can now be performed.'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Edit Match Result Dialog */}
      {editMatchData && (
        <EditMatchResultDialog
          open={editMatchDialogOpen}
          onOpenChange={setEditMatchDialogOpen}
          match={editMatchData}
          team1Players={editMatchData.team1PlayerIds.map(id => allPlayers.find(p => p.id === id)).filter(p => p !== undefined) as Player[]}
          team2Players={editMatchData.team2PlayerIds.map(id => allPlayers.find(p => p.id === id)).filter(p => p !== undefined) as Player[]}
        />
      )}
    </div>
  );
}