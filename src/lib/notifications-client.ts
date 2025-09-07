'use client';

import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserNotification } from './types';

// Real-time notification listener (for client-side use)
export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void,
  options: { unreadOnly?: boolean; limitCount?: number } = {}
): Unsubscribe {
  const { unreadOnly = false, limitCount = 20 } = options;

  let notificationQuery = query(
    collection(db, 'userNotifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  if (unreadOnly) {
    notificationQuery = query(
      notificationQuery,
      where('read', '==', false)
    );
  }

  if (limitCount) {
    notificationQuery = query(notificationQuery, firestoreLimit(limitCount));
  }

  return onSnapshot(notificationQuery, (snapshot) => {
    const notifications: UserNotification[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        expiresAt: data.expiresAt ? (data.expiresAt?.toDate?.() || new Date(data.expiresAt)) : undefined,
      } as UserNotification);
    });
    callback(notifications);
  }, (error) => {
    console.error('Error listening to notifications:', error);
    callback([]); // Return empty array on error
  });
}