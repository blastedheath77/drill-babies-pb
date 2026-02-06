'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNotifications } from '@/contexts/notification-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, AlertTriangle, Loader2 } from 'lucide-react';

export function NotificationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    isSupported,
    permissionStatus,
    settings,
    isLoading,
    requestPermission,
    toggleEventNotifications,
  } = useNotifications();

  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      const success = await toggleEventNotifications(enabled);
      if (success) {
        toast({
          title: enabled ? 'Notifications Enabled' : 'Notifications Disabled',
          description: enabled
            ? 'You will receive notifications for new events.'
            : 'You will no longer receive event notifications.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to update settings',
          description: enabled
            ? 'Could not enable notifications. Please check your browser settings.'
            : 'Could not disable notifications.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update notification settings.',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({
        title: 'Permission Granted',
        description: 'You can now enable event notifications.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Notifications were blocked. You can change this in your browser settings.',
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sign in to manage your notification preferences.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in your browser. Try using a modern
              browser like Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive updates about events and activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionStatus === 'denied' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. To enable them, please allow notifications for
              this site in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {permissionStatus === 'default' && (
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Click the button to allow notifications from PBStats.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRequestPermission}
              >
                Enable Notifications
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <div className="text-base font-medium">Event Notifications</div>
            <div className="text-sm text-muted-foreground">
              Get notified when new events are created in your clubs.
            </div>
          </div>
          <Switch
            checked={settings?.eventsEnabled || false}
            onCheckedChange={handleToggle}
            disabled={
              permissionStatus !== 'granted' ||
              isToggling
            }
          />
        </div>

        {permissionStatus === 'granted' && settings?.eventsEnabled && (
          <p className="text-sm text-muted-foreground">
            You will receive push notifications when club admins create new events.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
