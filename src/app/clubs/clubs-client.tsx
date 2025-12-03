'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useClubs, useCreateClub, useUpdateClub } from '@/hooks/use-clubs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Settings, Users } from 'lucide-react';
import type { Club } from '@/lib/types';
import Link from 'next/link';

export function ClubsClient() {
  const { user, isAdmin } = useAuth();
  const { data: clubs, isLoading } = useClubs();
  const createClub = useCreateClub();
  const updateClub = useUpdateClub();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Redirect if not admin
  if (!isAdmin()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to manage clubs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleCreateClub = async () => {
    if (!user) return;

    try {
      await createClub.mutateAsync({
        name: formData.name,
        description: formData.description,
        createdBy: user.id,
        isActive: true,
        settings: {
          allowPublicJoin: false,
          defaultPlayerRating: 1000,
        },
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating club:', error);
    }
  };

  const handleEditClub = async () => {
    if (!selectedClub) return;

    try {
      await updateClub.mutateAsync({
        id: selectedClub.id,
        data: {
          name: formData.name,
          description: formData.description,
        },
      });

      setIsEditDialogOpen(false);
      setSelectedClub(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error updating club:', error);
    }
  };

  const openCreateDialog = () => {
    setFormData({ name: '', description: '' });
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (club: Club) => {
    setSelectedClub(club);
    setFormData({
      name: club.name,
      description: club.description || '',
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clubs</h1>
          <p className="text-muted-foreground">
            Manage clubs and their members
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Club
        </Button>
      </div>

      {/* Clubs List */}
      {!clubs || clubs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No clubs yet</CardTitle>
            <CardDescription>
              Create your first club to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Card key={club.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{club.name}</CardTitle>
                    <CardDescription>
                      {club.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(club)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Members</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(club.createdDate).toLocaleDateString()}
                  </div>
                  <Link href={`/clubs/${club.id}/settings`}>
                    <Button variant="outline" className="w-full mt-4">
                      Manage Club
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Club Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Club</DialogTitle>
            <DialogDescription>
              Create a new club to organize players, games, and tournaments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Club Name *</Label>
              <Input
                id="name"
                placeholder="Enter club name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter club description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClub}
              disabled={!formData.name || createClub.isPending}
            >
              {createClub.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Club'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Club Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Club</DialogTitle>
            <DialogDescription>
              Update club information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Club Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter club name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter club description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditClub}
              disabled={!formData.name || updateClub.isPending}
            >
              {updateClub.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Club'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
