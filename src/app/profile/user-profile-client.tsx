'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useCircles } from '@/contexts/circle-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Settings, 
  MapPin, 
  Calendar, 
  Users, 
  Trophy, 
  Edit,
  Save,
  X,
  Shield,
  Mail,
  UserCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/user-profile-management';
import { ensureUserHasConnectedPlayer } from '@/lib/user-player-connection';
import type { User as UserType } from '@/lib/auth-types';
import { formatDistanceToNow } from 'date-fns';

interface EditableProfileData {
  name: string;
  city: string;
  country: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth: string;
  duprId: string;
}

export function UserProfileClient() {
  const { user, isLoading: authLoading } = useAuth();
  const { availableCircles, isLoadingCircles } = useCircles();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<EditableProfileData>({
    name: '',
    city: '',
    country: '',
    gender: '',
    dateOfBirth: '',
    duprId: '',
  });
  const [originalData, setOriginalData] = useState<EditableProfileData>({
    name: '',
    city: '',
    country: '',
    gender: '',
    dateOfBirth: '',
    duprId: '',
  });

  // Initialize profile data when user loads
  useEffect(() => {
    if (user) {
      const data: EditableProfileData = {
        name: user.name || '',
        city: user.location?.city || '',
        country: user.location?.country || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth || '',
        duprId: user.duprId || '',
      };
      setProfileData(data);
      setOriginalData(data);
    }
  }, [user]);

  // Ensure user has connected player on mount
  useEffect(() => {
    if (user && !user.connectedPlayerId) {
      ensureUserHasConnectedPlayer(user).then((result) => {
        if (result.success && result.wasCreated) {
          toast({
            title: 'Player Profile Created',
            description: 'A player profile has been automatically created for you to track game statistics.',
          });
        }
      }).catch(console.error);
    }
  }, [user, toast]);

  const handleInputChange = (field: keyof EditableProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updates: any = {};
      
      // Check what changed
      if (profileData.name !== originalData.name) {
        updates.name = profileData.name;
      }
      
      if (profileData.city !== originalData.city || profileData.country !== originalData.country) {
        updates.location = {
          city: profileData.city || '',
          country: profileData.country || ''
        };
      }
      
      if (profileData.gender !== originalData.gender) {
        updates.gender = profileData.gender || undefined;
      }
      
      if (profileData.dateOfBirth !== originalData.dateOfBirth) {
        updates.dateOfBirth = profileData.dateOfBirth || undefined;
      }
      
      if (profileData.duprId !== originalData.duprId) {
        updates.duprId = profileData.duprId || undefined;
      }

      if (Object.keys(updates).length > 0) {
        const result = await updateUserProfile(user.id, updates);
        
        if (result.success) {
          setOriginalData(profileData);
          setIsEditing(false);
          toast({
            title: 'Profile Updated',
            description: 'Your profile has been updated successfully.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: result.error || 'Failed to update profile.',
          });
        }
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred while updating your profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'player': return 'Player';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  };

  if (authLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertDescription>Unable to load user profile. Please try refreshing the page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button 
              onClick={handleCancel} 
              variant="outline"
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="circles">Circles</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Basic Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your basic profile information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and Basic Info */}
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-lg">
                      {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button variant="outline" size="sm" disabled>
                      Change Photo
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      {isEditing ? (
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <div className="flex items-center h-9 px-3 rounded-md border bg-background">
                          {user.name}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex items-center h-9 px-3 rounded-md border bg-muted">
                        {user.email}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed here
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      {isEditing ? (
                        <Input
                          id="city"
                          value={profileData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="e.g., San Francisco"
                        />
                      ) : (
                        <div className="flex items-center h-9 px-3 rounded-md border bg-background">
                          {user.location?.city || '—'}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      {isEditing ? (
                        <Input
                          id="country"
                          value={profileData.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          placeholder="e.g., United States"
                        />
                      ) : (
                        <div className="flex items-center h-9 px-3 rounded-md border bg-background">
                          {user.location?.country || '—'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      {isEditing ? (
                        <Select 
                          value={profileData.gender} 
                          onValueChange={(value) => handleInputChange('gender', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center h-9 px-3 rounded-md border bg-background">
                          {user.gender || '—'}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      {isEditing ? (
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={profileData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center h-9 px-3 rounded-md border bg-background">
                          {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : '—'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duprId">DUPR ID</Label>
                    {isEditing ? (
                      <Input
                        id="duprId"
                        value={profileData.duprId}
                        onChange={(e) => handleInputChange('duprId', e.target.value)}
                        placeholder="e.g., 12345678"
                      />
                    ) : (
                      <div className="flex items-center h-9 px-3 rounded-md border bg-background">
                        {user.duprId || '—'}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Your DUPR (Dynamic Universal Pickleball Rating) ID
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Circle Memberships
              </CardTitle>
              <CardDescription>
                Circles you belong to and your role in each
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCircles ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : availableCircles.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Circles Yet</h3>
                  <p className="text-muted-foreground">
                    You haven't joined any circles yet. Contact an admin to get invited to circles in your area.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableCircles.map((circle) => (
                    <div key={circle.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{circle.name}</h4>
                        <p className="text-sm text-muted-foreground">{circle.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={circle.isPrivate ? 'secondary' : 'outline'}>
                          {circle.isPrivate ? 'Private' : 'Public'}
                        </Badge>
                        {/* Add member role badge if we have that data */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Account details and system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Account Role</p>
                      <Badge variant="outline">{getRoleDisplayName(user.role)}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Member Since</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt))} ago
                      </p>
                    </div>
                  </div>

                  {user.connectedPlayerId && (
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Connected Player</p>
                        <p className="text-sm text-muted-foreground">
                          Player ID: {user.connectedPlayerId}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {user.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {user.location.city}, {user.location.country}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground">
                  These actions are permanent and cannot be undone.
                </p>
                <Button variant="destructive" disabled>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}