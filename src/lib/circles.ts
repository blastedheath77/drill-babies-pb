import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Circle } from './types';
import { handleDatabaseError, logError } from './errors';
import { logger } from './logger';

export async function getCircles(): Promise<Circle[]> {
  try {
    const circlesCollection = collection(db, 'circles');
    const q = query(circlesCollection, orderBy('name', 'asc'));

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase request timeout')), 10000); // 10 second timeout
    });

    const snapshot = await Promise.race([
      getDocs(q),
      timeoutPromise
    ]) as any;

    // Clean data to remove Firestore-specific objects that cause hydration issues
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      // Convert Firestore timestamps to ISO strings and remove problematic fields
      const { createdAt, ...cleanData } = data;
      return {
        id: doc.id,
        ...cleanData,
        createdDate: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : cleanData.createdDate,
      } as Circle;
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getCircles');

    // Return empty array with specific error handling
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('UNAVAILABLE')) {
        logger.warn('Firebase connection timeout, returning empty circles list');
      }
    }

    return [];
  }
}

export async function getCircleById(id: string): Promise<Circle | undefined> {
  try {
    const circleDoc = await getDoc(doc(db, 'circles', id));
    if (circleDoc.exists()) {
      const data = circleDoc.data();
      // Convert Firestore timestamps to ISO strings and remove problematic fields
      const { createdAt, ...cleanData } = data;
      return {
        id: circleDoc.id,
        ...cleanData,
        createdDate: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : cleanData.createdDate,
      } as Circle;
    }
    return undefined;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getCircleById');
    return undefined;
  }
}

export async function createCircle(data: Omit<Circle, 'id' | 'createdDate'>): Promise<string> {
  try {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Circle name is required');
    }

    // Check for duplicate names
    const existingCircles = await getCircles();
    const nameExists = existingCircles.some(
      circle => circle.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    );

    if (nameExists) {
      throw new Error('A circle with this name already exists');
    }

    // Validate playerIds array
    if (!Array.isArray(data.playerIds)) {
      throw new Error('playerIds must be an array');
    }

    const circleData = {
      name: data.name.trim(),
      description: data.description?.trim() || '',
      playerIds: data.playerIds,
      createdBy: data.createdBy,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'circles'), circleData);
    logger.info('Circle created successfully', { circleId: docRef.id, name: data.name });
    return docRef.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create circle';
    logError(error instanceof Error ? error : new Error(String(error)), 'createCircle');
    throw new Error(errorMessage);
  }
}

export async function updateCircle(id: string, data: Partial<Omit<Circle, 'id' | 'createdDate' | 'createdBy'>>): Promise<void> {
  try {
    // Validate circle exists
    const existingCircle = await getCircleById(id);
    if (!existingCircle) {
      throw new Error('Circle not found');
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Circle name cannot be empty');
      }

      // Check for duplicate names (excluding current circle)
      const existingCircles = await getCircles();
      const nameExists = existingCircles.some(
        circle => circle.id !== id && circle.name.toLowerCase().trim() === data.name!.toLowerCase().trim()
      );

      if (nameExists) {
        throw new Error('A circle with this name already exists');
      }
    }

    // Validate playerIds if provided
    if (data.playerIds !== undefined && !Array.isArray(data.playerIds)) {
      throw new Error('playerIds must be an array');
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || '';
    if (data.playerIds !== undefined) updateData.playerIds = data.playerIds;

    await updateDoc(doc(db, 'circles', id), updateData);
    logger.info('Circle updated successfully', { circleId: id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update circle';
    logError(error instanceof Error ? error : new Error(String(error)), 'updateCircle');
    throw new Error(errorMessage);
  }
}

export async function deleteCircle(id: string): Promise<void> {
  try {
    // Validate circle exists
    const existingCircle = await getCircleById(id);
    if (!existingCircle) {
      throw new Error('Circle not found');
    }

    await deleteDoc(doc(db, 'circles', id));
    logger.info('Circle deleted successfully', { circleId: id, name: existingCircle.name });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete circle';
    logError(error instanceof Error ? error : new Error(String(error)), 'deleteCircle');
    throw new Error(errorMessage);
  }
}

export async function getCirclesForPlayer(playerId: string): Promise<Circle[]> {
  try {
    if (!playerId || playerId.trim().length === 0) {
      return [];
    }

    const circlesCollection = collection(db, 'circles');
    const q = query(
      circlesCollection,
      where('playerIds', 'array-contains', playerId),
      orderBy('name', 'asc')
    );

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase request timeout')), 10000);
    });

    const snapshot = await Promise.race([
      getDocs(q),
      timeoutPromise
    ]) as any;

    // Clean data to remove Firestore-specific objects that cause hydration issues
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      // Convert Firestore timestamps to ISO strings and remove problematic fields
      const { createdAt, ...cleanData } = data;
      return {
        id: doc.id,
        ...cleanData,
        createdDate: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : cleanData.createdDate,
      } as Circle;
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getCirclesForPlayer');

    // Return empty array with specific error handling
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('UNAVAILABLE')) {
        logger.warn('Firebase connection timeout, returning empty circles list for player');
      }
    }

    return [];
  }
}

// Utility function to validate circle name uniqueness (for client-side validation)
export async function isCircleNameAvailable(name: string, excludeId?: string): Promise<boolean> {
  try {
    const circles = await getCircles();
    return !circles.some(
      circle =>
        circle.id !== excludeId &&
        circle.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'isCircleNameAvailable');
    // On error, assume name is not available to be safe
    return false;
  }
}

// Utility function to get circles with player count
export async function getCirclesWithPlayerCount(): Promise<Array<Circle & { playerCount: number }>> {
  try {
    const circles = await getCircles();
    return circles.map(circle => ({
      ...circle,
      playerCount: circle.playerIds.length,
    }));
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getCirclesWithPlayerCount');
    return [];
  }
}