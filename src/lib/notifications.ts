'use server';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { 
  UserNotification, 
  NotificationPreferences, 
  CreateNotificationRequest,
  NotificationType 
} from './types';

/**
 * Notification Management Functions
 */

// Create a new notification
export async function createNotification(
  request: CreateNotificationRequest
): Promise<{ success: boolean; notificationId?: string; message: string }> {
  try {
    logger.info(`Creating notification for user ${request.userId}:`, request.type);

    // Check if user has notifications enabled for this type
    const preferences = await getNotificationPreferences(request.userId);
    if (!shouldSendNotification(request.type, preferences)) {
      return {
        success: false,
        message: 'User has disabled this type of notification'
      };
    }

    const notificationData = {
      userId: request.userId,
      type: request.type,
      title: request.title,
      message: request.message,
      data: request.data || {},
      read: false,
      createdAt: serverTimestamp(),
      expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      actionUrl: request.actionUrl || null,
      actions: request.actions || []
    };

    const docRef = await addDoc(collection(db, 'userNotifications'), notificationData);

    logger.info(`Notification created successfully: ${docRef.id}`);
    return {
      success: true,
      notificationId: docRef.id,
      message: 'Notification created successfully'
    };
  } catch (error) {
    logger.error('Failed to create notification:', error);
    return {
      success: false,
      message: `Failed to create notification: ${error}`
    };
  }
}

// Get notifications for a user
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limitCount?: number;
    startAfterDoc?: any;
  } = {}
): Promise<{
  notifications: UserNotification[];
  hasMore: boolean;
  lastDoc?: any;
}> {
  try {
    const { unreadOnly = false, limitCount = 20, startAfterDoc } = options;

    let notificationQuery = query(
      collection(db, 'userNotifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (unreadOnly) {
      notificationQuery = query(
        collection(db, 'userNotifications'),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc')
      );
    }

    if (limitCount) {
      notificationQuery = query(notificationQuery, limit(limitCount + 1));
    }

    if (startAfterDoc) {
      notificationQuery = query(notificationQuery, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(notificationQuery);
    const notifications: UserNotification[] = [];
    let hasMore = false;
    let lastDoc = null;

    snapshot.docs.forEach((doc, index) => {
      if (limitCount && index === limitCount) {
        hasMore = true;
        return;
      }

      const data = doc.data();
      
      // Filter out expired notifications
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        return;
      }

      notifications.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        read: data.read,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
        actionUrl: data.actionUrl || null,
        actions: data.actions || []
      });

      if (index === notifications.length - 1) {
        lastDoc = doc;
      }
    });

    return {
      notifications,
      hasMore,
      lastDoc
    };
  } catch (error) {
    logger.error('Failed to get user notifications:', error);
    return {
      notifications: [],
      hasMore: false
    };
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notificationQuery = query(
      collection(db, 'userNotifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationQuery);
    
    // Filter out expired notifications
    const validNotifications = snapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.expiresAt || data.expiresAt.toDate() >= new Date();
    });

    return validNotifications.length;
  } catch (error) {
    logger.error('Failed to get unread notification count:', error);
    return 0;
  }
}

// Mark notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await updateDoc(doc(db, 'userNotifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Notification marked as read'
    };
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    return {
      success: false,
      message: `Failed to mark notification as read: ${error}`
    };
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const notificationQuery = query(
      collection(db, 'userNotifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      });
    });

    await batch.commit();

    return {
      success: true,
      message: `Marked ${snapshot.size} notifications as read`
    };
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    return {
      success: false,
      message: `Failed to mark notifications as read: ${error}`
    };
  }
}

// Delete notification
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, 'userNotifications', notificationId));

    return {
      success: true,
      message: 'Notification deleted successfully'
    };
  } catch (error) {
    logger.error('Failed to delete notification:', error);
    return {
      success: false,
      message: `Failed to delete notification: ${error}`
    };
  }
}

// Delete all read notifications for a user
export async function deleteReadNotifications(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const notificationQuery = query(
      collection(db, 'userNotifications'),
      where('userId', '==', userId),
      where('read', '==', true)
    );

    const snapshot = await getDocs(notificationQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return {
      success: true,
      message: `Deleted ${snapshot.size} read notifications`
    };
  } catch (error) {
    logger.error('Failed to delete read notifications:', error);
    return {
      success: false,
      message: `Failed to delete notifications: ${error}`
    };
  }
}

// Get notification preferences
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const docRef = doc(db, 'notificationPreferences', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        userId,
        emailNotifications: data.emailNotifications ?? true,
        pushNotifications: data.pushNotifications ?? true,
        circleInvites: data.circleInvites ?? true,
        gameResults: data.gameResults ?? true,
        ratingChanges: data.ratingChanges ?? true,
        systemAnnouncements: data.systemAnnouncements ?? true,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    } else {
      // Return default preferences
      return {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        circleInvites: true,
        gameResults: true,
        ratingChanges: true,
        systemAnnouncements: true,
        updatedAt: new Date().toISOString()
      };
    }
  } catch (error) {
    logger.error('Failed to get notification preferences:', error);
    // Return default preferences on error
    return {
      userId,
      emailNotifications: true,
      pushNotifications: true,
      circleInvites: true,
      gameResults: true,
      ratingChanges: true,
      systemAnnouncements: true,
      updatedAt: new Date().toISOString()
    };
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  preferences: Omit<NotificationPreferences, 'updatedAt'>
): Promise<{ success: boolean; message: string }> {
  try {
    const docRef = doc(db, 'notificationPreferences', preferences.userId);
    
    await updateDoc(docRef, {
      ...preferences,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Notification preferences updated successfully'
    };
  } catch (error) {
    // If document doesn't exist, create it
    try {
      await addDoc(collection(db, 'notificationPreferences'), {
        ...preferences,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Notification preferences created successfully'
      };
    } catch (createError) {
      logger.error('Failed to create notification preferences:', createError);
      return {
        success: false,
        message: `Failed to update notification preferences: ${createError}`
      };
    }
  }
}

// Helper function to check if notification should be sent
function shouldSendNotification(
  type: NotificationType,
  preferences: NotificationPreferences
): boolean {
  switch (type) {
    case 'circle_invite':
    case 'circle_invite_accepted':
    case 'circle_invite_declined':
      return preferences.circleInvites;
    case 'game_result':
      return preferences.gameResults;
    case 'rating_change':
      return preferences.ratingChanges;
    case 'system_announcement':
      return preferences.systemAnnouncements;
    default:
      return true; // Default to sending notification
  }
}

// Note: Real-time notification listener moved to notifications-client.ts for client-side use

// Clean up expired notifications (can be called periodically)
export async function cleanupExpiredNotifications(): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const expiredQuery = query(
      collection(db, 'userNotifications'),
      where('expiresAt', '<', new Date())
    );

    const snapshot = await getDocs(expiredQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info(`Cleaned up ${snapshot.size} expired notifications`);
    return {
      success: true,
      deletedCount: snapshot.size
    };
  } catch (error) {
    logger.error('Failed to cleanup expired notifications:', error);
    return {
      success: false,
      deletedCount: 0
    };
  }
}