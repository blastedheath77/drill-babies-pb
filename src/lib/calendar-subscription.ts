import { doc, getDoc, updateDoc, query, where, getDocs, collection, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';

/**
 * Generates a secure subscription token using SHA-256
 */
export async function generateSubscriptionToken(userId: string): Promise<string> {
  const timestamp = Date.now();
  const randomValue = Math.random().toString(36);
  const data = `${userId}_${timestamp}_${randomValue}`;

  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Gets existing subscription token or creates a new one for a user
 */
export async function getOrCreateSubscriptionToken(userId: string): Promise<string> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    // Return existing token if it exists
    if (userData.calendarSubscriptionToken) {
      return userData.calendarSubscriptionToken;
    }

    // Generate new token
    const token = await generateSubscriptionToken(userId);

    // Save token to user document
    await updateDoc(userRef, {
      calendarSubscriptionToken: token,
      calendarSubscriptionCreatedAt: Timestamp.now(),
    });

    logger.info(`Created calendar subscription token for user ${userId}`);

    return token;
  } catch (error) {
    logger.error('Error getting/creating subscription token:', error);
    throw error;
  }
}

/**
 * Validates a subscription token and returns the associated userId
 * Returns null if token is invalid
 */
export async function validateSubscriptionToken(token: string): Promise<string | null> {
  try {
    // Query users collection for matching token
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('calendarSubscriptionToken', '==', token));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      logger.warn('Invalid calendar subscription token attempted');
      return null;
    }

    // Return the userId (should only be one match)
    const userDoc = snapshot.docs[0];
    return userDoc.id;
  } catch (error) {
    logger.error('Error validating subscription token:', error);
    return null;
  }
}

/**
 * Revokes (deletes) a user's subscription token
 */
export async function revokeSubscriptionToken(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      calendarSubscriptionToken: null,
      calendarSubscriptionCreatedAt: null,
    });

    logger.info(`Revoked calendar subscription token for user ${userId}`);
  } catch (error) {
    logger.error('Error revoking subscription token:', error);
    throw error;
  }
}
