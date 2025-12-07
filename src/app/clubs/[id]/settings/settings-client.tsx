'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  useClub,
  useUpdateClub,
  useAddUserToClub,
  useRemoveUserFromClub,
  useDeleteClub,
} from '@/hooks/use-clubs';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, UserPlus, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { getAllUsers } from '@/lib/user-management';
import type { User } from '@/lib/auth-types';
import { Badge } from '@/components/ui/badge';

interface ClubSettingsClientProps {
  clubId: string;
}

export function ClubSettingsClient({ clubId }: ClubSettingsClientProps) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { data: club, isLoading } = useClub(clubId);
  const updateClub = useUpdateClub();
  const addUserToClub = useAddUserToClub();
  const removeUserFromClub = useRemoveUserFromClub();
  const deleteClub = useDeleteClub();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [clubMembers, setClubMembers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'club_admin'>('member');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    allowPublicJoin: false,
    defaultPlayerRating: 1000,
  });

  // Load all users and filter club members
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await getAllUsers();
        setAllUsers(users);

        // Filter users who are members of this club
        const members = users.filter((u) =>
          u.clubMemberships?.includes(clubId)
        );
        setClubMembers(members);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, [clubId]);

  // Update form data when club loads
  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name,
        description: club.description || '',
        allowPublicJoin: club.settings?.allowPublicJoin || false,
        defaultPlayerRating: club.settings?.defaultPlayerRating || 1000,
      });
    }
  }, [club]);

  // Check if user has permission to manage this club
  const canManageClub = () => {
    if (isAdmin()) return true;
    if (!user || !user.clubRoles) return false;
    return user.clubRoles[clubId] === 'club_admin';
  };

  if (!canManageClub()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to manage this club.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading || isLoadingUsers) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Club Not Found</CardTitle>
            <CardDescription>
              The club you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleUpdateClub = async () => {
    try {
      await updateClub.mutateAsync({
        id: clubId,
        data: {
          name: formData.name,
          description: formData.description,
          settings: {
            allowPublicJoin: formData.allowPublicJoin,
            defaultPlayerRating: formData.defaultPlayerRating,
          },
        },
      });
    } catch (error) {
      console.error('Error updating club:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    try {
      await addUserToClub.mutateAsync({
        userId: selectedUserId,
        clubId,
        role: selectedRole,
      });

      // Refresh users list
      const users = await getAllUsers();
      setAllUsers(users);
      const members = users.filter((u) =>
        u.clubMemberships?.includes(clubId)
      );
      setClubMembers(members);

      setIsAddMemberDialogOpen(false);
      setSelectedUserId('');
      setSelectedRole('member');
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the club?')) {
      return;
    }

    try {
      await removeUserFromClub.mutateAsync({ userId, clubId });

      // Refresh users list
      const users = await getAllUsers();
      setAllUsers(users);
      const members = users.filter((u) =>
        u.clubMemberships?.includes(clubId)
      );
      setClubMembers(members);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleDeleteClub = async () => {
    try {
      await deleteClub.mutateAsync(clubId);
      setIsDeleteDialogOpen(false);
      router.push('/clubs');
    } catch (error) {
      console.error('Error deleting club:', error);
    }
  };

  const availableUsers = allUsers.filter(
    (u) => !u.clubMemberships?.includes(clubId)
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/clubs')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{club.name} Settings</h1>
          <p className="text-muted-foreground">
            Manage club information and members
          </p>
        </div>
      </div>

      {/* Club Information */}
      <Card>
        <CardHeader>
          <CardTitle>Club Information</CardTitle>
          <CardDescription>
            Basic information about this club
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="club-name">Club Name *</Label>
            <Input
              id="club-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="club-description">Description</Label>
            <Textarea
              id="club-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-rating">Default Player Rating</Label>
            <Input
              id="default-rating"
              type="number"
              value={formData.defaultPlayerRating}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultPlayerRating: parseInt(e.target.value) || 1000,
                })
              }
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Created on {new Date(club.createdDate).toLocaleDateString()}
          </div>
          <Button
            onClick={handleUpdateClub}
            disabled={!formData.name || updateClub.isPending}
          >
            {updateClub.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members ({clubMembers.length})</CardTitle>
              <CardDescription>
                Users who have access to this club
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddMemberDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clubMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members yet. Add members to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {clubMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.email}
                      </div>
                    </div>
                    {member.clubRoles?.[clubId] === 'club_admin' && (
                      <Badge variant="secondary">
                        <Shield className="mr-1 h-3 w-3" />
                        Club Admin
                      </Badge>
                    )}
                    {member.role === 'admin' && (
                      <Badge variant="default">Global Admin</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={member.id === user?.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Delete Club</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will deactivate the club and make it no longer visible.
                    All data will be preserved but inaccessible.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Club
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog
        open={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a user to this club and assign them a role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No available users
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as 'member' | 'club_admin')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="club_admin">Club Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddMemberDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || addUserToClub.isPending}
            >
              {addUserToClub.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Club Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Club?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{club.name}</strong>?
              This action will deactivate the club and it will no longer be visible.
              All data associated with this club will be preserved but inaccessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClub}
              disabled={deleteClub.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClub.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Club'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
