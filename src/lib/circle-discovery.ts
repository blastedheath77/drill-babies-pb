/**
 * Circle Discovery and Request Management
 * 
 * Functions for finding and requesting to join circles
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit as firestoreLimit,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { addPlayerToCircle } from './admin-circle-management';
import { db } from './firebase';
import { logger } from './logger';
import type { Circle } from './types';
import type { User } from './auth-types';

export interface CircleSearchOptions {
  location?: {
    city?: string;
    country?: string;
  };
  searchTerm?: string;
  includePrivate?: boolean;
  limit?: number;
}

export interface CircleSearchResult {
  circles: Circle[];
  totalResults: number;
}

export interface CircleJoinRequest {
  id: string;
  circleId: string;
  circle?: Circle;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'declined';
  message?: string;
  createdAt: string;
  respondedAt?: string;
  respondedBy?: string;
}

/**
 * Search for public circles that users can discover and request to join
 */
export async function searchDiscoverableCircles(
  options: CircleSearchOptions = {}
): Promise<CircleSearchResult> {
  try {
    const {
      location,
      searchTerm,
      includePrivate = false,
      limit: searchLimit = 20
    } = options;

    logger.info('Searching discoverable circles', { options });

    let q = query(collection(db, 'circles'));

    // Only include public circles unless specifically requested
    if (!includePrivate) {
      q = query(q, where('isPrivate', '==', false));
    }

    // Add location filters if provided
    if (location?.city) {
      q = query(q, where('location.city', '==', location.city));
    }
    if (location?.country) {
      q = query(q, where('location.country', '==', location.country));
    }

    // Order by member count (most active first)
    q = query(q, orderBy('memberCount', 'desc'));

    // Apply limit
    q = query(q, firestoreLimit(searchLimit));

    const snapshot = await getDocs(q);
    let circles: Circle[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      circles.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Circle);
    });

    // If search term provided, filter by name and description
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      circles = circles.filter(circle => 
        circle.name.toLowerCase().includes(term) ||
        circle.description.toLowerCase().includes(term)
      );
    }

    logger.info(`Found ${circles.length} discoverable circles`);

    return {
      circles,
      totalResults: circles.length
    };

  } catch (error) {
    logger.error('Error searching discoverable circles', error);
    throw error;
  }
}

/**
 * Request to join a circle
 */
export async function requestToJoinCircle(
  circleId: string,
  user: User,
  message?: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    logger.info('Creating circle join request', { circleId, userId: user.id });

    // Check if user is already a member
    const membershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId),
      where('userId', '==', user.id)
    );
    const membershipSnapshot = await getDocs(membershipQuery);

    if (!membershipSnapshot.empty) {
      return {
        success: false,
        error: 'You are already a member of this circle'
      };
    }

    // Check if there's already a pending request
    const existingRequestQuery = query(
      collection(db, 'circleJoinRequests'),
      where('circleId', '==', circleId),
      where('requesterId', '==', user.id),
      where('status', '==', 'pending')
    );
    const existingRequestSnapshot = await getDocs(existingRequestQuery);

    if (!existingRequestSnapshot.empty) {
      return {
        success: false,
        error: 'You already have a pending request for this circle'
      };
    }

    // Create the join request
    const requestData = {
      circleId,
      requesterId: user.id,
      requesterName: user.name,
      requesterEmail: user.email,
      status: 'pending' as const,
      message: message?.trim() || '',
      createdAt: serverTimestamp(),
    };

    const requestRef = await addDoc(collection(db, 'circleJoinRequests'), requestData);

    logger.info('Circle join request created', { requestId: requestRef.id });

    return {
      success: true,
      requestId: requestRef.id
    };

  } catch (error) {
    logger.error('Error creating circle join request', { circleId, userId: user.id, error });
    return {
      success: false,
      error: 'Failed to create join request. Please try again.'
    };
  }
}

/**
 * Get pending join requests for a circle (for circle admins)
 */
export async function getCircleJoinRequests(
  circleId: string
): Promise<CircleJoinRequest[]> {
  try {
    const requestsQuery = query(
      collection(db, 'circleJoinRequests'),
      where('circleId', '==', circleId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(requestsQuery);
    const requests: CircleJoinRequest[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        respondedAt: data.respondedAt?.toDate?.()?.toISOString() || data.respondedAt,
      } as CircleJoinRequest);
    });

    return requests;

  } catch (error) {
    logger.error('Error fetching circle join requests', { circleId, error });
    return [];
  }
}

/**
 * Get user's own join requests
 */
export async function getUserJoinRequests(
  userId: string
): Promise<CircleJoinRequest[]> {
  try {
    const requestsQuery = query(
      collection(db, 'circleJoinRequests'),
      where('requesterId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(requestsQuery);
    const requests: CircleJoinRequest[] = [];

    // Get circle info for each request
    for (const requestDoc of snapshot.docs) {
      const data = requestDoc.data();
      
      // Fetch circle details
      let circle: Circle | undefined;
      try {
        const circleDoc = await getDoc(doc(db, 'circles', data.circleId));
        if (circleDoc.exists()) {
          const circleData = circleDoc.data();
          circle = {
            id: circleDoc.id,
            ...circleData,
            createdAt: circleData.createdAt?.toDate?.()?.toISOString() || circleData.createdAt,
            updatedAt: circleData.updatedAt?.toDate?.()?.toISOString() || circleData.updatedAt,
          } as Circle;
        }
      } catch (circleError) {
        logger.warn('Failed to fetch circle details for request', { 
          requestId: requestDoc.id, 
          circleId: data.circleId,
          error: circleError 
        });
      }

      requests.push({
        id: requestDoc.id,
        ...data,
        circle,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        respondedAt: data.respondedAt?.toDate?.()?.toISOString() || data.respondedAt,
      } as CircleJoinRequest);
    }

    return requests;

  } catch (error) {
    logger.error('Error fetching user join requests', { userId, error });
    return [];
  }
}

/**
 * Respond to a join request (approve or decline)
 */
export async function respondToJoinRequest(
  requestId: string,
  status: 'approved' | 'declined',
  responderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Responding to join request', { requestId, status, responderId });

    const requestRef = doc(db, 'circleJoinRequests', requestId);
    
    // Update the request status
    await updateDoc(requestRef, {
      status,
      respondedAt: serverTimestamp(),
      respondedBy: responderId,
    });

    // If approved, add user to circle using proper function
    if (status === 'approved') {
      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        const requestData = requestDoc.data();
        
        // Use the proper addPlayerToCircle function to maintain data consistency
        const addResult = await addPlayerToCircle(
          requestData.requesterId,
          requestData.circleId,
          responderId
        );
        
        if (addResult.success) {
          logger.info('User added to circle via join request', {
            circleId: requestData.circleId,
            userId: requestData.requesterId
          });
        } else {
          logger.error('Failed to add user to circle via join request', {
            circleId: requestData.circleId,
            userId: requestData.requesterId,
            error: addResult.message
          });
          // Note: We don't fail the whole operation since the request was already marked as approved
        }
      }
    }

    return { success: true };

  } catch (error) {
    logger.error('Error responding to join request', { requestId, error });
    return {
      success: false,
      error: 'Failed to respond to join request. Please try again.'
    };
  }
}

/**
 * Cancel a pending join request
 */
export async function cancelJoinRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Canceling join request', { requestId, userId });

    const requestRef = doc(db, 'circleJoinRequests', requestId);
    await updateDoc(requestRef, {
      status: 'declined',
      respondedAt: serverTimestamp(),
      respondedBy: userId, // User canceled their own request
    });

    return { success: true };

  } catch (error) {
    logger.error('Error canceling join request', { requestId, error });
    return {
      success: false,
      error: 'Failed to cancel join request. Please try again.'
    };
  }
}