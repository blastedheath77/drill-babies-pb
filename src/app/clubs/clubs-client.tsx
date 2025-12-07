'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useClubs, useCreateClub } from '@/hooks/use-clubs';
import { getClubMemberCount } from '@/lib/clubs';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Users, Search } from 'lucide-react';
import type { Club } from '@/lib/types';
import Link from 'next/link';

export function ClubsClient() {
  const { user, isAdmin } = useAuth();
  const { data: clubs, isLoading } = useClubs();
  const createClub = useCreateClub();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Load member counts for all clubs
  useEffect(() => {
    async function loadMemberCounts() {
      if (!clubs) return;

      const counts: Record<string, number> = {};
      await Promise.all(
        clubs.map(async (club) => {
          counts[club.id] = await getClubMemberCount(club.id);
        })
      );
      setMemberCounts(counts);
    }

    loadMemberCounts();
  }, [clubs]);

  // Filter clubs based on search query
  const filteredClubs = useMemo(() => {
    if (!clubs) return [];
    if (!searchQuery.trim()) return clubs;

    const query = searchQuery.toLowerCase();
    return clubs.filter(
      (club) =>
        club.name.toLowerCase().includes(query) ||
        club.description?.toLowerCase().includes(query)
    );
  }, [clubs, searchQuery]);

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

  const openCreateDialog = () => {
    setFormData({ name: '', description: '' });
    setIsCreateDialogOpen(true);
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

      {/* Search */}
      {clubs && clubs.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

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
      ) : filteredClubs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No clubs found</CardTitle>
            <CardDescription>
              No clubs match your search query.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClubs.map((club) => {
            const memberCount = memberCounts[club.id] ?? 0;

            return (
              <Card key={club.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="space-y-1">
                    <CardTitle className="truncate">{club.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {club.description || 'No description'}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Members</span>
                      </div>
                      <Badge variant="secondary">
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(club.createdDate).toLocaleDateString()}
                    </div>
                    <Link href={`/clubs/${club.id}/settings`}>
                      <Button variant="outline" className="w-full mt-2">
                        Manage Club
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
    </div>
  );
}
