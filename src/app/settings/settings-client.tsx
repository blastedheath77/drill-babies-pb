'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { updateUserDocument } from '@/lib/user-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, User, Bell, Palette, LogOut, Loader2, Calendar, Copy, RefreshCw } from 'lucide-react';

export function SettingsClient() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    settings,
    permissionStatus,
    toggleEventNotifications,
    requestPermission,
    isSupported,
  } = useNotifications();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // Initialize name from user
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const isDark = savedTheme === 'light' ? false : true;
      setTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const handleUpdateName = async () => {
    if (!user || !name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid name',
        description: 'Please enter a valid name.',
      });
      return;
    }

    if (name.trim() === user.name) {
      toast({
        description: 'No changes to save.',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateUserDocument(user.id, { name: name.trim() });
      if (success) {
        toast({
          title: 'Profile updated',
          description: 'Your name has been updated successfully.',
        });
        // Refresh the page to update the user context
        window.location.reload();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!isSupported) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Notifications are not supported in this browser.',
      });
      return;
    }

    if (enabled && permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          variant: 'destructive',
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
        });
        return;
      }
    }

    const success = await toggleEventNotifications(enabled);
    if (success) {
      toast({
        title: enabled ? 'Notifications enabled' : 'Notifications disabled',
        description: enabled
          ? 'You will receive notifications for new events.'
          : 'You will no longer receive event notifications.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to update',
        description: 'Could not update notification settings.',
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Load subscription URL on mount
  useEffect(() => {
    if (user?.id) {
      loadSubscriptionUrl();
    }
  }, [user?.id]);

  const loadSubscriptionUrl = async () => {
    if (!user?.id) return;

    setIsLoadingToken(true);
    try {
      const { getOrCreateSubscriptionToken } = await import('@/lib/calendar-subscription');
      const token = await getOrCreateSubscriptionToken(user.id);
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/calendar/feed/${token}`;
      setSubscriptionUrl(url);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load subscription URL',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoadingToken(false);
    }
  };

  const handleCopySubscriptionUrl = async () => {
    if (!subscriptionUrl) return;

    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      toast({
        title: 'Copied to clipboard',
        description: 'Subscription URL copied successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Could not copy URL to clipboard',
      });
    }
  };

  const handleRegenerateToken = async () => {
    if (!user?.id) return;

    setIsLoadingToken(true);
    try {
      const { revokeSubscriptionToken, getOrCreateSubscriptionToken } = await import('@/lib/calendar-subscription');

      // Revoke old token
      await revokeSubscriptionToken(user.id);

      // Generate new token
      const token = await getOrCreateSubscriptionToken(user.id);
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/calendar/feed/${token}`;
      setSubscriptionUrl(url);

      toast({
        title: 'Token regenerated',
        description: 'Your old subscription URL is now invalid. Update your calendar app with the new URL.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to regenerate token',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoadingToken(false);
    }
  };

  const getWebcalUrl = (httpsUrl: string): string => {
    return httpsUrl.replace('https://', 'webcal://');
  };

  const getGoogleSubscribeUrl = (feedUrl: string): string => {
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
  };

  const getOutlookSubscribeUrl = (feedUrl: string): string => {
    return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clubCount = user.clubMemberships?.length || 0;

  return (
    <div className="container max-w-2xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                />
                <Button
                  onClick={handleUpdateName}
                  disabled={isUpdating || !name.trim() || name.trim() === user.name}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>
              Customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-4">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('light')}
                  className="flex-1"
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('dark')}
                  className="flex-1"
                >
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <div className="text-sm text-muted-foreground">
                Notifications are not supported in this browser.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="event-notifications">Event notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new events
                    </p>
                  </div>
                  <Switch
                    id="event-notifications"
                    checked={settings?.eventsEnabled || false}
                    onCheckedChange={handleToggleNotifications}
                  />
                </div>
                {permissionStatus !== 'granted' && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    Browser permission required. Enable the switch to grant permission.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Calendar Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Integration
            </CardTitle>
            <CardDescription>
              Automatically sync events you RSVP &quot;Yes&quot; to with your calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingToken ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Subscription URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={subscriptionUrl}
                      readOnly
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      onClick={handleCopySubscriptionUrl}
                      variant="outline"
                      size="icon"
                      title="Copy URL"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Subscribe to this URL in your calendar app to automatically sync events
                  </p>
                </div>

                {/* Debug info */}
                {user?.id && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <strong>Debug:</strong> User ID: {user.id}
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <Label>How to Subscribe</Label>

                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <p className="font-medium">Google Calendar:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Calendar</a></li>
                      <li>Click the <strong>+</strong> next to &quot;Other calendars&quot;</li>
                      <li>Select &quot;From URL&quot;</li>
                      <li>Paste your subscription URL (copied above)</li>
                      <li>Click &quot;Add calendar&quot;</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <p className="font-medium">Apple Calendar:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>Open Calendar app</li>
                      <li>File → New Calendar Subscription</li>
                      <li>Paste your subscription URL</li>
                      <li>Click Subscribe</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <p className="font-medium">Outlook:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>Open <a href="https://outlook.live.com/calendar" target="_blank" rel="noopener noreferrer" className="underline">Outlook Calendar</a></li>
                      <li>Add calendar → Subscribe from web</li>
                      <li>Paste your subscription URL</li>
                      <li>Import</li>
                    </ol>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>What to Expect</Label>
                  <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded">
                    <p>• <strong>Calendar name:</strong> Will appear as &quot;PBStats Events&quot;</p>
                    <p>• <strong>Update frequency:</strong> Calendar apps check for updates every 1-24 hours</p>
                    <p>• <strong>What syncs:</strong> Only events you RSVP &quot;Yes&quot; to</p>
                    <p>• <strong>Auto-updates:</strong> When you change RSVPs, calendar updates automatically</p>
                    <p>• <strong>Not instant:</strong> Changes may take a few hours to appear</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Security</Label>
                  <Button
                    onClick={handleRegenerateToken}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Subscription URL
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This will invalidate your old URL. You&apos;ll need to re-subscribe in your calendar app.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Role</Label>
              <Badge variant="secondary">
                {user.role === 'admin' ? 'Admin' : user.role === 'player' ? 'Player' : 'Viewer'}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Clubs</Label>
              <span className="text-sm text-muted-foreground">
                {clubCount} {clubCount === 1 ? 'club' : 'clubs'}
              </span>
            </div>
            <Separator />
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
