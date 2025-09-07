import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAt,
  endAt,
  getDocs,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { User, UserDocument } from './auth-types';

export interface UserSearchOptions {
  searchTerm?: string;
  excludeUserIds?: string[];
  excludeEmails?: string[];
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  includeRoles?: string[];
  excludeRoles?: string[];
  // Geographic filters
  city?: string;
  country?: string;
  location?: {
    city?: string;
    country?: string;
  };
  // Demographic filters
  gender?: 'Male' | 'Female' | 'Other';
  // Radius-based search (placeholder for future implementation)
  nearLocation?: {
    city: string;
    country: string;
    radiusKm?: number;
  };
}

export interface UserSearchResult {
  users: User[];
  hasMore: boolean;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
  totalResults: number;
}

/**
 * Search for users by name or email with advanced filtering options
 */
export async function searchUsers(options: UserSearchOptions = {}): Promise<UserSearchResult> {
  try {
    const {
      searchTerm = '',
      excludeUserIds = [],
      excludeEmails = [],
      limit: resultLimit = 20,
      startAfter,
      includeRoles = [],
      excludeRoles = []
    } = options;

    logger.info('Searching users', { searchTerm, excludeUserIds: excludeUserIds.length, resultLimit });

    const constraints: QueryConstraint[] = [];

    // If we have a search term, create queries for both name and email searches
    if (searchTerm.trim()) {
      // For name search: use substring matching approach
      const searchLower = searchTerm.toLowerCase().trim();
      
      // We'll need to do client-side filtering for partial matches
      // Firestore doesn't support full-text search, so we'll fetch more docs and filter
      constraints.push(orderBy('name'));
    } else {
      // No search term, just order by name
      constraints.push(orderBy('name'));
    }

    // Add pagination
    if (startAfter) {
      constraints.push(startAt(startAfter));
    }

    // Add limit (fetch more for client-side filtering)
    const fetchLimit = searchTerm.trim() ? Math.min(resultLimit * 3, 100) : resultLimit;
    constraints.push(limit(fetchLimit));

    // Build and execute query
    const usersQuery = query(collection(db, 'users'), ...constraints);
    const querySnapshot = await getDocs(usersQuery);

    // Convert documents to User objects
    let users: User[] = querySnapshot.docs.map(doc => {
      const userData = doc.data() as UserDocument;
      return {
        id: userData.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar,
        createdAt: userData.createdAt?.toDate().toISOString(),
        updatedAt: userData.updatedAt?.toDate().toISOString(),
        location: userData.location,
        gender: userData.gender,
        dateOfBirth: userData.dateOfBirth,
        duprId: userData.duprId,
        connectedPlayerId: userData.connectedPlayerId,
      };
    });

    // Client-side filtering
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      users = users.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(searchLower);
        const emailMatch = user.email.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
      });
    }

    // Apply exclusion filters
    if (excludeUserIds.length > 0) {
      users = users.filter(user => !excludeUserIds.includes(user.id));
    }

    if (excludeEmails.length > 0) {
      const excludeEmailsLower = excludeEmails.map(email => email.toLowerCase());
      users = users.filter(user => !excludeEmailsLower.includes(user.email.toLowerCase()));
    }

    // Apply role filters
    if (includeRoles.length > 0) {
      users = users.filter(user => includeRoles.includes(user.role));
    }

    if (excludeRoles.length > 0) {
      users = users.filter(user => !excludeRoles.includes(user.role));
    }

    // Apply geographical filters
    const {
      city,
      country,
      location,
      gender,
      nearLocation,
    } = options;

    if (city) {
      const cityLower = city.toLowerCase().trim();
      users = users.filter(user => 
        user.location?.city?.toLowerCase().includes(cityLower)
      );
    }

    if (country) {
      const countryLower = country.toLowerCase().trim();
      users = users.filter(user => 
        user.location?.country?.toLowerCase().includes(countryLower)
      );
    }

    if (location) {
      if (location.city) {
        const cityLower = location.city.toLowerCase().trim();
        users = users.filter(user => 
          user.location?.city?.toLowerCase().includes(cityLower)
        );
      }
      if (location.country) {
        const countryLower = location.country.toLowerCase().trim();
        users = users.filter(user => 
          user.location?.country?.toLowerCase().includes(countryLower)
        );
      }
    }

    // Apply demographic filters
    if (gender) {
      users = users.filter(user => user.gender === gender);
    }

    // Apply proximity-based filtering (basic implementation)
    if (nearLocation) {
      const { city: nearCity, country: nearCountry } = nearLocation;
      const nearCityLower = nearCity.toLowerCase().trim();
      const nearCountryLower = nearCountry.toLowerCase().trim();
      
      users = users.filter(user => {
        if (!user.location) return false;
        
        // For now, do exact city match or same country
        // In the future, this could use actual geographical distance calculations
        const sameCity = user.location.city?.toLowerCase() === nearCityLower;
        const sameCountry = user.location.country?.toLowerCase() === nearCountryLower;
        
        return sameCity || sameCountry;
      });
    }

    // Limit results to requested amount
    const hasMore = users.length > resultLimit;
    const limitedUsers = users.slice(0, resultLimit);
    
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    const result: UserSearchResult = {
      users: limitedUsers,
      hasMore: hasMore || querySnapshot.docs.length >= fetchLimit,
      lastDoc: hasMore || searchTerm.trim() ? lastDoc : undefined,
      totalResults: limitedUsers.length
    };

    logger.info('User search completed', { 
      found: limitedUsers.length, 
      hasMore: result.hasMore,
      searchTerm: searchTerm ? '***' : 'none' // Don't log actual search terms for privacy
    });

    return result;

  } catch (error) {
    logger.error('Error searching users:', error);
    return {
      users: [],
      hasMore: false,
      totalResults: 0
    };
  }
}

/**
 * Search for users by email address specifically
 * Useful for invitation systems where you want to check if a user exists by email
 */
export async function searchUsersByEmail(
  emails: string[], 
  excludeUserIds: string[] = []
): Promise<User[]> {
  try {
    if (emails.length === 0) return [];

    logger.info('Searching users by email', { emailCount: emails.length });

    const normalizedEmails = emails.map(email => email.toLowerCase().trim());
    const constraints: QueryConstraint[] = [
      where('email', 'in', normalizedEmails.slice(0, 10)), // Firestore limit for 'in' queries
      orderBy('email')
    ];

    const usersQuery = query(collection(db, 'users'), ...constraints);
    const querySnapshot = await getDocs(usersQuery);

    let users: User[] = querySnapshot.docs.map(doc => {
      const userData = doc.data() as UserDocument;
      return {
        id: userData.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar,
        createdAt: userData.createdAt?.toDate().toISOString(),
        updatedAt: userData.updatedAt?.toDate().toISOString(),
        location: userData.location,
        gender: userData.gender,
        dateOfBirth: userData.dateOfBirth,
        duprId: userData.duprId,
        connectedPlayerId: userData.connectedPlayerId,
      };
    });

    // Apply exclusion filter
    if (excludeUserIds.length > 0) {
      users = users.filter(user => !excludeUserIds.includes(user.id));
    }

    logger.info('Email search completed', { found: users.length });

    return users;

  } catch (error) {
    logger.error('Error searching users by email:', error);
    return [];
  }
}

/**
 * Get a single user by email address
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const results = await searchUsersByEmail([email]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    logger.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Search for users not in a specific circle
 * Useful for circle invitation systems
 */
export async function searchUsersNotInCircle(
  circleId: string,
  searchOptions: Omit<UserSearchOptions, 'excludeUserIds'> = {}
): Promise<UserSearchResult> {
  try {
    logger.info('Searching users not in circle', { circleId });

    // First get all members of the circle
    const membersQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId)
    );
    
    const membersSnapshot = await getDocs(membersQuery);
    const memberUserIds = membersSnapshot.docs.map(doc => doc.data().userId);

    logger.info('Found circle members to exclude', { count: memberUserIds.length });

    // Now search users excluding these members
    return await searchUsers({
      ...searchOptions,
      excludeUserIds: [...(searchOptions.excludeUserIds || []), ...memberUserIds]
    });

  } catch (error) {
    logger.error('Error searching users not in circle:', error);
    
    // Fallback: if we can't get circle members (e.g., due to missing indexes),
    // just do a regular user search with the original excludeUserIds
    logger.warn('Falling back to regular user search due to circle member query failure');
    
    try {
      return await searchUsers(searchOptions);
    } catch (fallbackError) {
      logger.error('Fallback user search also failed:', fallbackError);
      return {
        users: [],
        hasMore: false,
        totalResults: 0
      };
    }
  }
}

/**
 * Search for both users and phantom players not in a specific circle
 * This function combines results from users and players collections
 */
export async function searchUsersAndPhantomPlayersNotInCircle(
  circleId: string,
  searchOptions: Omit<UserSearchOptions, 'excludeUserIds'> = {}
): Promise<UserSearchResult> {
  try {
    logger.info('Searching users and phantom players not in circle', { circleId });

    // First get all members of the circle (both user IDs and player IDs that are members)
    const membersQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId)
    );
    
    const membersSnapshot = await getDocs(membersQuery);
    const memberUserIds = membersSnapshot.docs.map(doc => doc.data().userId);

    logger.info('Found circle members to exclude', { count: memberUserIds.length });

    // Search regular users
    const userResults = await searchUsers({
      ...searchOptions,
      excludeUserIds: [...(searchOptions.excludeUserIds || []), ...memberUserIds]
    });

    // Search phantom players
    const phantomResults = await searchPhantomPlayers({
      ...searchOptions,
      excludePlayerIds: [...(searchOptions.excludeUserIds || []), ...memberUserIds] // Use same exclusion list
    });

    // Convert phantom players to User format for consistency
    const phantomUsersConverted: User[] = phantomResults.players.map(player => ({
      id: player.id,
      name: player.name,
      email: player.email || '',
      role: 'phantom' as any, // Special role to identify phantom players
      avatar: player.avatar || '',
      createdAt: player.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Combine results
    const combinedUsers = [...userResults.users, ...phantomUsersConverted];
    const { searchTerm = '', limit: resultLimit = 20 } = searchOptions;

    // Apply search term filtering to combined results if needed
    let filteredUsers = combinedUsers;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredUsers = combinedUsers.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(searchLower);
        const emailMatch = user.email && user.email.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
      });
    }

    // Sort by name and limit results
    filteredUsers.sort((a, b) => a.name.localeCompare(b.name));
    const hasMore = filteredUsers.length > resultLimit;
    const limitedUsers = filteredUsers.slice(0, resultLimit);

    const result: UserSearchResult = {
      users: limitedUsers,
      hasMore: hasMore || userResults.hasMore || phantomResults.hasMore,
      totalResults: limitedUsers.length
    };

    logger.info('Combined search completed', { 
      regularUsers: userResults.users.length,
      phantomPlayers: phantomResults.players.length,
      combined: limitedUsers.length
    });

    return result;

  } catch (error) {
    logger.error('Error searching users and phantom players not in circle:', error);
    
    // Fallback to regular user search
    logger.warn('Falling back to regular user search due to combined search failure');
    
    try {
      return await searchUsersNotInCircle(circleId, searchOptions);
    } catch (fallbackError) {
      logger.error('Fallback user search also failed:', fallbackError);
      return {
        users: [],
        hasMore: false,
        totalResults: 0
      };
    }
  }
}

interface PhantomPlayerSearchOptions {
  searchTerm?: string;
  excludePlayerIds?: string[];
  limit?: number;
}

interface PhantomPlayerSearchResult {
  players: Array<{
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    isPhantom: boolean;
    createdAt?: string;
  }>;
  hasMore: boolean;
  totalResults: number;
}

/**
 * Search phantom players in the players collection
 */
async function searchPhantomPlayers(options: PhantomPlayerSearchOptions = {}): Promise<PhantomPlayerSearchResult> {
  try {
    const {
      searchTerm = '',
      excludePlayerIds = [],
      limit: resultLimit = 20
    } = options;

    logger.info('Searching phantom players', { searchTerm: searchTerm ? '***' : 'none', excludeCount: excludePlayerIds.length });

    // Build query constraints
    const constraints: QueryConstraint[] = [
      where('isPhantom', '==', true) // Only phantom players
    ];

    // Add limit (fetch more for client-side filtering if we have search term)
    const fetchLimit = searchTerm.trim() ? Math.min(resultLimit * 2, 50) : resultLimit;
    constraints.push(limit(fetchLimit));

    // Build and execute query
    const playersQuery = query(collection(db, 'players'), ...constraints);
    const querySnapshot = await getDocs(playersQuery);

    // Convert documents to simplified player objects
    let players = querySnapshot.docs.map(doc => {
      const playerData = doc.data();
      return {
        id: doc.id,
        name: playerData.name || '',
        email: playerData.email || '',
        avatar: playerData.avatar || '',
        isPhantom: playerData.isPhantom || false,
        createdAt: playerData.createdAt?.toDate?.()?.toISOString() || playerData.createdAt
      };
    });

    // Client-side filtering
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      players = players.filter(player => {
        const nameMatch = player.name.toLowerCase().includes(searchLower);
        const emailMatch = player.email && player.email.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
      });
    }

    // Apply exclusion filter
    if (excludePlayerIds.length > 0) {
      players = players.filter(player => !excludePlayerIds.includes(player.id));
    }

    // Limit results
    const hasMore = players.length > resultLimit;
    const limitedPlayers = players.slice(0, resultLimit);

    const result: PhantomPlayerSearchResult = {
      players: limitedPlayers,
      hasMore: hasMore || querySnapshot.docs.length >= fetchLimit,
      totalResults: limitedPlayers.length
    };

    logger.info('Phantom player search completed', { found: limitedPlayers.length, hasMore: result.hasMore });

    return result;

  } catch (error) {
    logger.error('Error searching phantom players:', error);
    return {
      players: [],
      hasMore: false,
      totalResults: 0
    };
  }
}

/**
 * Search for users by location (city, country, or both)
 */
export async function searchUsersByLocation(
  location: { city?: string; country?: string },
  options: Omit<UserSearchOptions, 'location' | 'city' | 'country'> = {}
): Promise<UserSearchResult> {
  try {
    logger.info('Searching users by location', { location });

    return await searchUsers({
      ...options,
      location,
    });

  } catch (error) {
    logger.error('Error searching users by location:', error);
    return {
      users: [],
      hasMore: false,
      totalResults: 0
    };
  }
}

/**
 * Get users near a specific location
 */
export async function getUsersNearLocation(
  nearLocation: { city: string; country: string; radiusKm?: number },
  options: Omit<UserSearchOptions, 'nearLocation'> = {}
): Promise<UserSearchResult> {
  try {
    logger.info('Getting users near location', { nearLocation });

    return await searchUsers({
      ...options,
      nearLocation,
    });

  } catch (error) {
    logger.error('Error getting users near location:', error);
    return {
      users: [],
      hasMore: false,
      totalResults: 0
    };
  }
}

/**
 * Get suggested users based on location proximity and other criteria
 */
export async function getSuggestedUsers(
  currentUserId: string,
  excludeUserIds: string[] = [],
  limit: number = 10,
  userLocation?: { city: string; country: string }
): Promise<User[]> {
  try {
    logger.info('Getting suggested users', { currentUserId, limit, hasLocation: !!userLocation });

    // If user has location, prioritize users in same location
    if (userLocation) {
      const nearbyResult = await getUsersNearLocation(
        userLocation,
        {
          excludeUserIds: [currentUserId, ...excludeUserIds],
          limit: Math.ceil(limit * 0.7), // 70% from nearby users
        }
      );

      // Fill remaining slots with general suggestions
      const remaining = limit - nearbyResult.users.length;
      if (remaining > 0) {
        const generalResult = await searchUsers({
          excludeUserIds: [currentUserId, ...excludeUserIds, ...nearbyResult.users.map(u => u.id)],
          limit: remaining,
        });

        return [...nearbyResult.users, ...generalResult.users];
      }

      return nearbyResult.users;
    }

    // Fallback to general user search
    const result = await searchUsers({
      excludeUserIds: [currentUserId, ...excludeUserIds],
      limit,
    });

    return result.users;

  } catch (error) {
    logger.error('Error getting suggested users:', error);
    return [];
  }
}

export default {
  searchUsers,
  searchUsersByEmail,
  searchUsersByLocation,
  getUsersNearLocation,
  getUserByEmail,
  searchUsersNotInCircle,
  searchUsersAndPhantomPlayersNotInCircle,
  getSuggestedUsers
};