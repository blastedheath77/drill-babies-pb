'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Trash2, Save, AlertTriangle, Users, Calendar, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useBoxLeague, useUpdateBoxLeague, useDeleteBoxLeague } from '@/hooks/use-box-leagues';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

interface SettingsClientProps {
  boxLeagueId: string;
}

export function SettingsClient({ boxLeagueId }: SettingsClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: boxLeague, isLoading } = useBoxLeague(boxLeagueId);
  const updateBoxLeague = useUpdateBoxLeague();
  const deleteBoxLeague = useDeleteBoxLeague();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'completed' | 'paused',
    roundsPerCycle: 3
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form data when box league loads
  React.useEffect(() => {
    if (boxLeague) {
      setFormData({
        name: boxLeague.name,
        description: boxLeague.description || '',
        status: boxLeague.status,
        roundsPerCycle: boxLeague.roundsPerCycle
      });
    }
  }, [boxLeague]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('League name is required');
      return;
    }

    if (formData.roundsPerCycle < 1 || formData.roundsPerCycle > 5) {
      alert('Rounds per cycle must be between 1 and 5');
      return;
    }

    try {
      await updateBoxLeague.mutateAsync({
        id: boxLeagueId,
        updates: {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          roundsPerCycle: formData.roundsPerCycle
        }
      });

      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating box league:', error);
      alert('Failed to update settings. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!boxLeague) return;

    setIsDeleting(true);
    try {
      await deleteBoxLeague.mutateAsync(boxLeague.id);
      router.push('/box-leagues');
    } catch (error) {
      console.error('Error deleting box league:', error);
      alert('Failed to delete box league. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const canEdit = () => {
    // Add permission checks here based on user role
    return user && boxLeague;
  };

  const canDelete = () => {
    // Only allow deletion if league hasn't started or user is admin
    return canEdit() && (boxLeague?.currentRound === 0 || user?.role === 'admin');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
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

  if (!canEdit()) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">You don't have permission to edit this box league.</p>
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
          <h1 className="text-3xl font-bold">League Settings</h1>
          <p className="text-muted-foreground">{boxLeague.name}</p>
        </div>
        <Badge variant={boxLeague.status === 'active' ? 'default' : 'secondary'}>
          {boxLeague.status}
        </Badge>
      </div>

      {/* Warning for Active League */}
      {boxLeague.currentRound > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This league has already started. Some settings cannot be changed during an active league.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter league name..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter league description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'completed' | 'paused') =>
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* League Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              League Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roundsPerCycle">Rounds Per Cycle</Label>
              <Select
                value={formData.roundsPerCycle.toString()}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, roundsPerCycle: parseInt(value) }))
                }
                disabled={boxLeague.currentRound > 0}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Round</SelectItem>
                  <SelectItem value="2">2 Rounds</SelectItem>
                  <SelectItem value="3">3 Rounds</SelectItem>
                  <SelectItem value="4">4 Rounds</SelectItem>
                  <SelectItem value="5">5 Rounds</SelectItem>
                </SelectContent>
              </Select>
              {boxLeague.currentRound > 0 && (
                <p className="text-sm text-muted-foreground">
                  Cannot change this setting after the league has started
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Boxes:</span>
                <div className="font-semibold">{boxLeague.totalBoxes}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Players:</span>
                <div className="font-semibold">{boxLeague.totalBoxes * 4}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* League Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              League Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Cycle:</span>
                <div className="font-semibold">{boxLeague.currentCycle}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Current Round:</span>
                <div className="font-semibold">
                  {boxLeague.currentRound === 0 ? 'Not Started' : `${boxLeague.currentRound} of ${boxLeague.roundsPerCycle}`}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div className="font-semibold">
                  {new Date(boxLeague.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <div className="font-semibold">
                  {new Date(boxLeague.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div>
            {canDelete() && (
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete League
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Box League</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="mb-4">
                      Are you sure you want to delete "{boxLeague.name}"? This action cannot be undone.
                    </p>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This will permanently delete the league, all boxes, rounds, matches, and statistics.
                      </AlertDescription>
                    </Alert>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete League'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href={`/box-leagues/${boxLeagueId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={updateBoxLeague.isPending}>
              {updateBoxLeague.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}