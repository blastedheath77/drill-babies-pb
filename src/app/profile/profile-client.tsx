'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  User,
  Settings,
  Bell,
  Shield,
  Edit3,
  Save,
  X,
  UserCircle,
  Mail,
  MapPin,
  Calendar,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getNotificationPreferences,
  updateNotificationPreferences
} from '@/lib/notifications';
import { getUserPlayerProfile } from '@/lib/data';
import type { NotificationPreferences, Player } from '@/lib/types';

interface ProfileData {
  name: string;
  email: string;
  avatar: string;
  bio?: string;
  location?: {
    city: string;
    country: string;
  };
}

export function ProfileClient() {
  const { user, isLoading: authLoading, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    avatar: '',
    bio: '',
    location: { city: '', country: '' }
  });
  
  const [originalProfileData, setOriginalProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    avatar: '',
    bio: '',
    location: { city: '', country: '' }
  });
  
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    userId: '',
    emailNotifications: true,
    pushNotifications: true,
    circleInvites: true,
    gameResults: true,
    ratingChanges: true,
    systemAnnouncements: true,
    updatedAt: new Date().toISOString()
  });

  const [playerProfile, setPlayerProfile] = useState<Player | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load user data
  useEffect(() => {
    if (!user?.id) return;

    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // Load notification preferences
        const prefs = await getNotificationPreferences(user.id);
        setNotificationPreferences(prefs);

        // Load player profile if exists
        const player = await getUserPlayerProfile(user.id);
        setPlayerProfile(player);

        // Set profile data
        const profile: ProfileData = {
          name: user.name || '',
          email: user.email || '',
          avatar: user.avatar || '',
          bio: user.bio || '',
          location: user.location || { city: '', country: '' }
        };

        setProfileData(profile);
        setOriginalProfileData(profile);
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, toast]);

  const handleProfileChange = (field: keyof ProfileData, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (field: 'city' | 'country', value: string) => {
    setProfileData(prev => ({
      ...prev,
      location: {
        ...prev.location!,
        [field]: value
      }
    }));
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Update user profile
      await updateUserProfile({
        name: profileData.name,
        bio: profileData.bio,
        location: profileData.location
      });

      setOriginalProfileData(profileData);
      setIsEditing(false);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated'
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData(originalProfileData);
    setIsEditing(false);
  };

  const handleNotificationPreferenceChange = async (
    field: keyof Omit<NotificationPreferences, 'userId' | 'updatedAt'>,
    value: boolean
  ) => {
    if (!user?.id) return;

    try {
      const updatedPreferences = {
        ...notificationPreferences,
        [field]: value
      };

      await updateNotificationPreferences(updatedPreferences);
      setNotificationPreferences(updatedPreferences);

      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved'
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive'
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Profile Information
              </CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileData.avatar} alt={profileData.name} />
                  <AvatarFallback className="text-lg">
                    {profileData.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                )}
              </div>

              {/* Profile Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled={true} // Email should not be editable
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio || ''}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.location?.city || ''}
                    onChange={(e) => handleLocationChange('city', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={profileData.location?.country || ''}
                    onChange={(e) => handleLocationChange('country', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player Profile Section */}
          {playerProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  Player Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Connected Player: {playerProfile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Rating: {playerProfile.rating.toFixed(2)} " 
                      Record: {playerProfile.wins}W-{playerProfile.losses}L
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/players/${playerProfile.id}`)}
                  >
                    View Player Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email & Push Notifications */}
              <div className="space-y-4">
                <h4 className="font-medium">Delivery Methods</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.emailNotifications}
                      onCheckedChange={(checked) =>
                        handleNotificationPreferenceChange('emailNotifications', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive browser push notifications
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.pushNotifications}
                      onCheckedChange={(checked) =>
                        handleNotificationPreferenceChange('pushNotifications', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Types */}
              <div className="space-y-4">
                <h4 className="font-medium">Notification Types</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Circle Invitations</Label>
                      <p className="text-sm text-muted-foreground">
                        When someone invites you to join a circle
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.circleInvites}
                      onCheckedChange={(checked) =>
                        handleNotificationPreferenceChange('circleInvites', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Game Results</Label>
                      <p className="text-sm text-muted-foreground">
                        When games involving you are logged
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.gameResults}
                      onCheckedChange={(checked) =>
                        handleNotificationPreferenceChange('gameResults', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Rating Changes</Label>
                      <p className="text-sm text-muted-foreground">
                        When your rating changes significantly
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.ratingChanges}
                      onCheckedChange={(checked) =>
                        handleNotificationPreferenceChange('ratingChanges', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>System Announcements</Label>
                      <p className="text-sm text-muted-foreground">
                        Important updates and announcements
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.systemAnnouncements}
                      onCheckedChange={(checked) =>
                        handleNotificationPreferenceChange('systemAnnouncements', checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Account Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage your account details and security settings
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h5 className="font-medium">Change Password</h5>
                      <p className="text-sm text-muted-foreground">
                        Update your account password
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h5 className="font-medium">Export Data</h5>
                      <p className="text-sm text-muted-foreground">
                        Download your account data
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Export Data
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-destructive">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground">
                    Irreversible and destructive actions
                  </p>
                </div>

                <div className="border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-destructive">Delete Account</h5>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}