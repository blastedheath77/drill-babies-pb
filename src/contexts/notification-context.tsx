'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import {
  requestNotificationPermission,
  areNotificationsSupported,
  getNotificationPermissionStatus,
  getUserNotificationSettings,
  updateUserNotificationSettings,
  enableEventNotifications,
  disableEventNotifications,
} from '@/lib/notifications';
import type { NotificationSettings } from '@/lib/types';
import { logger } from '@/lib/logger';

interface NotificationContextValue {
  isSupported: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  settings: NotificationSettings | null;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  toggleEventNotifications: (enabled: boolean) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check support and permission on mount
  useEffect(() => {
    const supported = areNotificationsSupported();
    setIsSupported(supported);
    setPermissionStatus(getNotificationPermissionStatus());
  }, []);

  // Load user settings when user changes
  const refreshSettings = useCallback(async () => {
    if (!user?.id) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userSettings = await getUserNotificationSettings(user.id);
      setSettings(userSettings || { eventsEnabled: false });
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setSettings({ eventsEnabled: false });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const requestPermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(getNotificationPermissionStatus());
    return granted;
  };

  const toggleEventNotifications = async (enabled: boolean): Promise<boolean> => {
    if (!user?.id) {
      logger.warn('Cannot toggle notifications: no user logged in');
      return false;
    }

    logger.info(`Toggling notifications for user: ${user.id} (${user.email})`);

    try {
      if (enabled) {
        const success = await enableEventNotifications(user.id);
        if (success) {
          logger.info(`Successfully enabled notifications for user: ${user.id}`);
          setSettings((prev) => prev ? { ...prev, eventsEnabled: true } : { eventsEnabled: true });
          setPermissionStatus(getNotificationPermissionStatus());
        }
        return success;
      } else {
        await disableEventNotifications(user.id);
        logger.info(`Disabled notifications for user: ${user.id}`);
        setSettings((prev) => prev ? { ...prev, eventsEnabled: false } : { eventsEnabled: false });
        return true;
      }
    } catch (error) {
      logger.error('Error toggling event notifications:', error);
      return false;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        isSupported,
        permissionStatus,
        settings,
        isLoading,
        requestPermission,
        toggleEventNotifications,
        refreshSettings,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
