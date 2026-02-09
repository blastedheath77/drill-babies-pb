'use client';

import { useState, useEffect } from 'react';
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
import { Settings, User, Bell, Palette, LogOut, Loader2, Calendar } from 'lucide-react';
import {
  type CalendarPreference,
  getCalendarPreference,
  setCalendarPreference,
} from '@/lib/calendar-export';

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
  const [calendarPref, setCalendarPref] = useState<CalendarPreference | null>(null);

  // Initialize name from user
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Initialize theme and calendar preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const isDark = savedTheme === 'light' ? false : true;
      setTheme(isDark ? 'dark' : 'light');
      setCalendarPref(getCalendarPreference());
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

  const handleCalendarPrefChange = (preference: CalendarPreference) => {
    setCalendarPreference(preference);
    setCalendarPref(preference);
    toast({
      title: 'Calendar preference updated',
      description: preference !== 'none'
        ? 'Events will be added to your calendar when you RSVP "Yes".'
        : 'Events will not be added to your calendar automatically.',
    });
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
              Automatically add events to your calendar when you RSVP &quot;Yes&quot;
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Preferred Calendar</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={calendarPref === 'google' ? 'default' : 'outline'}
                  onClick={() => handleCalendarPrefChange('google')}
                  className="w-full"
                >
                  Google Calendar
                </Button>
                <Button
                  variant={calendarPref === 'ics' ? 'default' : 'outline'}
                  onClick={() => handleCalendarPrefChange('ics')}
                  className="w-full"
                >
                  Apple / Other
                </Button>
                <Button
                  variant={calendarPref === 'outlook' ? 'default' : 'outline'}
                  onClick={() => handleCalendarPrefChange('outlook')}
                  className="w-full"
                >
                  Outlook
                </Button>
                <Button
                  variant={calendarPref === 'none' ? 'default' : 'outline'}
                  onClick={() => handleCalendarPrefChange('none')}
                  className="w-full"
                >
                  Don&apos;t auto-add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {calendarPref && calendarPref !== 'none'
                  ? 'Events will automatically open in your preferred calendar when you RSVP "Yes".'
                  : calendarPref === 'none'
                    ? 'Events will not be added to your calendar automatically.'
                    : 'No preference set. You\'ll be asked to choose when you first RSVP "Yes".'}
              </p>
            </div>
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
