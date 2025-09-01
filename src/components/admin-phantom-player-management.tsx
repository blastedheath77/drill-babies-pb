'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Ghost,
  Mail,
  UserCheck,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  Upload,
  Download,
  RefreshCw,
  Users,
  Database,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllPhantomPlayersWithStatus,
  createPhantomPlayer,
  deletePhantomPlayer,
  updatePhantomPlayer,
  makePhantomPlayerClaimable,
  getPhantomPlayerStats,
  createPhantomPlayerBatch
} from '@/lib/phantom-players';
import { PhantomPlayerBadge, PhantomPlayerStatsCard } from './phantom-player-indicators';
import { BulkPhantomImport } from './bulk-phantom-import';
import type { PlayerWithClaimStatus } from '@/lib/types';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface PhantomPlayerStats {
  totalPhantom: number;
  claimable: number;
  anonymous: number;
  claimed: number;
}

export function AdminPhantomPlayerManagement() {
  const [phantomPlayers, setPhantomPlayers] = useState<PlayerWithClaimStatus[]>([]);
  const [stats, setStats] = useState<PhantomPlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Create phantom player form
  const [newPhantomName, setNewPhantomName] = useState('');
  const [newPhantomEmail, setNewPhantomEmail] = useState('');
  const [isCreatingPhantom, setIsCreatingPhantom] = useState(false);

  // Edit phantom player
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithClaimStatus | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [playersData, statsData] = await Promise.all([
        getAllPhantomPlayersWithStatus(),
        getPhantomPlayerStats()
      ]);
      
      setPhantomPlayers(playersData);
      setStats({
        totalPhantom: statsData.totalPhantom,
        claimable: statsData.claimable,
        anonymous: statsData.anonymous,
        claimed: statsData.claimed
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load phantom player data'
      });
    }
    setIsLoading(false);
  };

  const handleCreatePhantomPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhantomName.trim()) return;

    setIsCreatingPhantom(true);
    try {
      const result = await createPhantomPlayer({
        name: newPhantomName,
        email: newPhantomEmail || undefined,
        createdBy: 'admin' // This would be the current user ID in real implementation
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: `Phantom player "${newPhantomName}" created successfully`
        });
        setNewPhantomName('');
        setNewPhantomEmail('');
        await loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create phantom player'
      });
    }
    setIsCreatingPhantom(false);
  };

  const handleEditPhantomPlayer = async (player: PlayerWithClaimStatus) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditEmail(player.email || '');
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer) return;

    try {
      const result = await updatePhantomPlayer(
        editingPlayer.id,
        { name: editName },
        'admin'
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Phantom player updated successfully'
        });
        setEditingPlayer(null);
        await loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update phantom player'
      });
    }
  };

  const handleMakeClaimable = async (playerId: string) => {
    const email = prompt('Enter email address to make this phantom player claimable:');
    if (!email) return;

    try {
      const result = await makePhantomPlayerClaimable(playerId, email, 'admin');
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Phantom player is now claimable'
        });
        await loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to make phantom player claimable'
      });
    }
  };

  const handleDeletePhantomPlayer = async (playerId: string, playerName: string) => {
    try {
      const result = await deletePhantomPlayer(playerId, 'admin');
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Phantom player "${playerName}" deleted`
        });
        await loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete phantom player'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'claimed': return 'text-green-600';
      case 'claimable': return 'text-blue-600';
      case 'anonymous': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ghost className="h-5 w-5 mr-2" />
            Phantom Player Management
          </CardTitle>
          <CardDescription>
            Manage phantom players, claiming status, and bulk operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">Manage Players</TabsTrigger>
              <TabsTrigger value="create">Create Player</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {stats && <PhantomPlayerStatsCard stats={stats} />}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {phantomPlayers.slice(0, 5).map((player) => (
                        <div key={player.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <PhantomPlayerBadge player={player} variant="compact" showTooltip={false} />
                            <span>{player.name}</span>
                          </div>
                          <Badge variant="secondary" className={getStatusColor(player.claimStatus)}>
                            {player.claimStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      onClick={() => setActiveTab('create')} 
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Phantom Player
                    </Button>
                    <Button 
                      onClick={() => setShowBulkImport(true)} 
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import Players
                    </Button>
                    <Button 
                      onClick={loadData} 
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="players" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">All Phantom Players ({phantomPlayers.length})</h3>
                <Button onClick={loadData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Games</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phantomPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{player.name}</span>
                            <PhantomPlayerBadge player={player} variant="compact" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(player.claimStatus)}>
                            {player.claimStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {player.email || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {player.createdAt && formatDistanceToNow(parseISO(player.createdAt)) + ' ago'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {player.wins + player.losses}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              onClick={() => handleEditPhantomPlayer(player)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {player.claimStatus === 'anonymous' && (
                              <Button
                                onClick={() => handleMakeClaimable(player.id)}
                                size="sm"
                                variant="outline"
                                className="text-blue-600"
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                            {player.claimStatus !== 'claimed' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-red-600">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Phantom Player</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{player.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePhantomPlayer(player.id, player.name)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {phantomPlayers.length === 0 && (
                <div className="text-center py-8">
                  <Ghost className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No phantom players found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create Phantom Player</CardTitle>
                  <CardDescription>
                    Create a new phantom player that can optionally be claimed by users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePhantomPlayer} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phantomName">Player Name *</Label>
                      <Input
                        id="phantomName"
                        value={newPhantomName}
                        onChange={(e) => setNewPhantomName(e.target.value)}
                        placeholder="Enter player name"
                        required
                        disabled={isCreatingPhantom}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phantomEmail">Email (Optional)</Label>
                      <Input
                        id="phantomEmail"
                        type="email"
                        value={newPhantomEmail}
                        onChange={(e) => setNewPhantomEmail(e.target.value)}
                        placeholder="Enter email to make claimable"
                        disabled={isCreatingPhantom}
                      />
                      <p className="text-xs text-muted-foreground">
                        If you provide an email, users can claim this phantom player during registration
                      </p>
                    </div>

                    <Button type="submit" disabled={isCreatingPhantom} className="w-full">
                      {isCreatingPhantom ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Phantom Player
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <BulkPhantomImport
                onImportComplete={loadData}
                className="border-none shadow-none"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Player Dialog */}
      <AlertDialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Phantom Player</AlertDialogTitle>
            <AlertDialogDescription>
              Update the phantom player information
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={true}
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed once set. Use "Make Claimable" action for anonymous players.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveEdit}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}