import { logger } from './logger';

// Firebase Messaging types (imported dynamically)
type Messaging = any;
type MessagePayload = any;

let messaging: Messaging | null = null;

// Dynamic imports for Firebase Messaging (only in browser)
let getMessagingModule: any = null;
let getTokenModule: any = null;
let onMessageModule: any = null;

// Promise that resolves when messaging is initialized
let messagingInitPromise: Promise<void> | null = null;

// Initialize messaging only in browser and if supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messagingInitPromise = (async () => {
    try {
      // Dynamically import Firebase Messaging
      const messagingModule = await import('firebase/messaging');
      getMessagingModule = messagingModule.getMessaging;
      getTokenModule = messagingModule.getToken;
      onMessageModule = messagingModule.onMessage;

      // Import Firebase app
      const firebaseModule = await import('./firebase');

      try {
        messaging = getMessagingModule(firebaseModule.app);
        logger.info('Firebase Messaging initialized');
      } catch (error) {
        logger.warn('Firebase Messaging not available:', error);
      }
    } catch (error) {
      logger.warn('Failed to initialize Firebase Messaging:', error);
    }
  })();
}

/**
 * Request permission and get FCM token
 */
export async function requestFcmToken(): Promise<string | null> {
  // Wait for messaging to initialize if it's still initializing
  if (messagingInitPromise) {
    await messagingInitPromise;
  }

  if (!messaging || !getTokenModule) {
    logger.warn('Messaging not initialized');
    return null;
  }

  try {
    // Get VAPID key from environment or config
    // TODO: Add your VAPID key here from Firebase Console
    // You can also store it in an environment variable
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || '';

    if (!vapidKey) {
      logger.warn('VAPID key not configured. Add NEXT_PUBLIC_VAPID_KEY to your environment.');
      logger.warn('Get your VAPID key from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      logger.warn('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get FCM token
    const token = await getTokenModule(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    logger.info('FCM token obtained');
    return token;
  } catch (error) {
    logger.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages (when app is open)
 */
export async function onForegroundMessage(callback: (payload: MessagePayload) => void): Promise<() => void> {
  // Wait for messaging to initialize if it's still initializing
  if (messagingInitPromise) {
    await messagingInitPromise;
  }

  if (!messaging || !onMessageModule) {
    logger.warn('Messaging not initialized for foreground messages');
    return () => {};
  }

  try {
    const unsubscribe = onMessageModule(messaging, (payload: MessagePayload) => {
      logger.info('Foreground message received:', payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    logger.error('Error setting up foreground message listener:', error);
    return () => {};
  }
}

/**
 * Check if FCM is supported
 */
export function isMessagingSupported(): boolean {
  return messaging !== null;
}
