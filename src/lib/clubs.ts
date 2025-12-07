import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Club } from './types';
import { logger } from './logger';

const clubsCollection = collection(db, 'clubs');
const usersCollection = collection(db, 'users');

// Convert Firestore document to Club object
function documentToClub(docData: any, id: string): Club {
  return {
    id,
    name: docData.name,
    description: docData.description,
    createdDate: docData.createdDate instanceof Timestamp
      ? docData.createdDate.toDate().toISOString()
      : docData.createdDate,
    createdBy: docData.createdBy,
    isActive: docData.isActive ?? true,
    settings: docData.settings || {},
  };
}

/**
 * Get all active clubs
 */
export async function getClubs(): Promise<Club[]> {
  try {
    const q = query(
      clubsCollection,
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);

    const clubs = snapshot.docs.map(doc => documentToClub(doc.data(), doc.id));

    // Sort by name on the client side
    return clubs.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logger.error('Error fetching clubs:', error);
    throw error;
  }
}

/**
 * Get a specific club by ID
 */
export async function getClubById(id: string): Promise<Club | undefined> {
  try {
    const clubDoc = await getDoc(doc(clubsCollection, id));

    if (!clubDoc.exists()) {
      return undefined;
    }

    return documentToClub(clubDoc.data(), clubDoc.id);
  } catch (error) {
    logger.error(`Error fetching club ${id}:`, error);
    throw error;
  }
}

/**
 * Get clubs that a user has access to
 */
export async function getClubsForUser(userId: string, clubIds: string[]): Promise<Club[]> {
  try {
    if (clubIds.length === 0) {
      return [];
    }

    // Firestore 'in' queries limited to 10 items
    const clubs: Club[] = [];

    // Process in batches of 10
    for (let i = 0; i < clubIds.length; i += 10) {
      const batch = clubIds.slice(i, i + 10);
      const q = query(
        clubsCollection,
        where('__name__', 'in', batch),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      const batchClubs = snapshot.docs.map(doc => documentToClub(doc.data(), doc.id));
      clubs.push(...batchClubs);
    }

    // Sort by name
    return clubs.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logger.error(`Error fetching clubs for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a new club (admin only)
 */
export async function createClub(data: Omit<Club, 'id' | 'createdDate'>): Promise<string> {
  try {
    const clubData = {
      name: data.name,
      description: data.description || '',
      createdBy: data.createdBy,
      createdDate: serverTimestamp(),
      isActive: data.isActive ?? true,
      settings: data.settings || {
        allowPublicJoin: false,
        defaultPlayerRating: 1000,
      },
    };

    const docRef = await addDoc(clubsCollection, clubData);
    logger.info(`Created club: ${data.name} (${docRef.id})`);

    return docRef.id;
  } catch (error) {
    logger.error('Error creating club:', error);
    throw error;
  }
}

/**
 * Update club settings
 */
export async function updateClub(id: string, data: Partial<Club>): Promise<void> {
  try {
    const clubRef = doc(clubsCollection, id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.settings !== undefined) updateData.settings = data.settings;

    await updateDoc(clubRef, updateData);
    logger.info(`Updated club: ${id}`);
  } catch (error) {
    logger.error(`Error updating club ${id}:`, error);
    throw error;
  }
}

/**
 * Add a user to a club
 */
export async function addUserToClub(
  userId: string,
  clubId: string,
  role: 'club_admin' | 'member'
): Promise<void> {
  try {
    const userRef = doc(usersCollection, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error(`User ${userId} not found`);
    }

    const userData = userDoc.data();
    const clubMemberships = userData.clubMemberships || [];
    const clubRoles = userData.clubRoles || {};

    // Add club to memberships if not already there
    if (!clubMemberships.includes(clubId)) {
      clubMemberships.push(clubId);
    }

    // Set club role
    clubRoles[clubId] = role;

    // If user has no selected club, select this one
    const selectedClubId = userData.selectedClubId || clubId;

    await updateDoc(userRef, {
      clubMemberships,
      clubRoles,
      selectedClubId,
      updatedAt: serverTimestamp(),
    });

    logger.info(`Added user ${userId} to club ${clubId} with role ${role}`);
  } catch (error) {
    logger.error(`Error adding user ${userId} to club ${clubId}:`, error);
    throw error;
  }
}

/**
 * Remove a user from a club
 */
export async function removeUserFromClub(userId: string, clubId: string): Promise<void> {
  try {
    const userRef = doc(usersCollection, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error(`User ${userId} not found`);
    }

    const userData = userDoc.data();
    const clubMemberships = (userData.clubMemberships || []).filter((id: string) => id !== clubId);
    const clubRoles = { ...userData.clubRoles };
    delete clubRoles[clubId];

    // If the selected club is being removed, switch to another club or null
    let selectedClubId = userData.selectedClubId;
    if (selectedClubId === clubId) {
      selectedClubId = clubMemberships.length > 0 ? clubMemberships[0] : null;
    }

    await updateDoc(userRef, {
      clubMemberships,
      clubRoles,
      selectedClubId,
      updatedAt: serverTimestamp(),
    });

    logger.info(`Removed user ${userId} from club ${clubId}`);
  } catch (error) {
    logger.error(`Error removing user ${userId} from club ${clubId}:`, error);
    throw error;
  }
}

/**
 * Delete a club (admin only)
 * Note: This performs a soft delete by setting isActive to false
 */
export async function deleteClub(clubId: string): Promise<void> {
  try {
    const clubRef = doc(clubsCollection, clubId);

    // Soft delete - set isActive to false instead of actually deleting
    await updateDoc(clubRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });

    logger.info(`Deleted (soft) club: ${clubId}`);
  } catch (error) {
    logger.error(`Error deleting club ${clubId}:`, error);
    throw error;
  }
}

/**
 * Get the number of members in a club
 */
export async function getClubMemberCount(clubId: string): Promise<number> {
  try {
    const q = query(
      usersCollection,
      where('clubMemberships', 'array-contains', clubId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    logger.error(`Error getting member count for club ${clubId}:`, error);
    return 0;
  }
}
