import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { NotificationSettings } from './types';

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    logger.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    logger.warn('Notification permission was denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    logger.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Get user's notification settings from Firestore
 */
export async function getUserNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return userData.notificationSettings || { eventsEnabled: false };
  } catch (error) {
    logger.error('Error getting notification settings:', error);
    return null;
  }
}

/**
 * Update user's notification settings in Firestore
 */
export async function updateUserNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentSettings = userDoc.data().notificationSettings || { eventsEnabled: false };
    const updatedSettings = { ...currentSettings, ...settings };

    await updateDoc(userRef, {
      notificationSettings: updatedSettings,
    });

    logger.info(`Updated notification settings for user ${userId}`);
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    throw error;
  }
}

/**
 * Save FCM token to user's document
 */
export async function saveFcmToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentSettings = userDoc.data().notificationSettings || { eventsEnabled: false };

    await updateDoc(userRef, {
      notificationSettings: {
        ...currentSettings,
        fcmToken: token,
      },
    });

    logger.info(`Saved FCM token for user ${userId}`);
  } catch (error) {
    logger.error('Error saving FCM token:', error);
    throw error;
  }
}

/**
 * Remove FCM token from user's document
 */
export async function removeFcmToken(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentSettings = userDoc.data().notificationSettings || {};
    const { fcmToken, ...restSettings } = currentSettings;

    await updateDoc(userRef, {
      notificationSettings: restSettings,
    });

    logger.info(`Removed FCM token for user ${userId}`);
  } catch (error) {
    logger.error('Error removing FCM token:', error);
    throw error;
  }
}

/**
 * Enable event notifications for a user
 */
export async function enableEventNotifications(userId: string): Promise<boolean> {
  try {
    logger.info('Starting enableEventNotifications process');

    // First, request permission
    logger.info('Requesting notification permission');
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      logger.warn('Notification permission not granted');
      return false;
    }
    logger.info('Notification permission granted');

    // Get FCM token
    logger.info('Importing firebase-messaging module');
    const { requestFcmToken } = await import('./firebase-messaging');
    logger.info('Requesting FCM token');
    const fcmToken = await requestFcmToken();

    if (!fcmToken) {
      logger.warn('Failed to get FCM token');
      return false;
    }
    logger.info('FCM token obtained successfully');

    // Save FCM token
    logger.info('Saving FCM token to Firestore');
    await saveFcmToken(userId, fcmToken);

    // Update user settings
    logger.info('Updating user notification settings');
    await updateUserNotificationSettings(userId, { eventsEnabled: true });

    logger.info('Successfully completed enableEventNotifications');
    return true;
  } catch (error) {
    logger.error('Error enabling event notifications:', error);
    return false;
  }
}

/**
 * Disable event notifications for a user
 */
export async function disableEventNotifications(userId: string): Promise<void> {
  try {
    await updateUserNotificationSettings(userId, { eventsEnabled: false });
    // Optionally remove FCM token
    await removeFcmToken(userId);
  } catch (error) {
    logger.error('Error disabling event notifications:', error);
    throw error;
  }
}

/**
 * Show a local notification (for testing or fallback)
 */
export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (Notification.permission !== 'granted') {
    logger.warn('Notification permission not granted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });
  } catch (error) {
    logger.error('Error showing notification:', error);
  }
}
