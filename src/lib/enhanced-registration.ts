import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserDocument } from './user-management';
import { findClaimablePlayersForUser, bulkClaimPlayers } from './player-claiming';
import { logUserOnboardingCompleted } from './audit-trail';
import { logger } from './logger';
import type { User, UserRole } from './auth-types';
import type { Player } from './types';

/**
 * Enhanced User Registration System
 * 
 * This module extends the standard user registration to include phantom player
 * discovery and claiming as part of the signup flow.
 */

export interface RegistrationWithClaimingRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  claimPlayerIds?: string[]; // Player IDs to claim during registration
}

export interface RegistrationWithClaimingResponse {
  success: boolean;
  user?: User;
  claimablePhantomPlayers?: Array<Player & { 
    canClaim: boolean; 
    claimError?: string;
    gamesPlayed: number;
    currentRating: number;
  }>;
  claimingResults?: {
    claimedCount: number;
    failed: Array<{ playerId: string; error: string }>;
  };
  error?: string;
  requiresPlayerSelection?: boolean; // If true, user needs to select players to claim
}

/**
 * Step 1: Check for claimable phantom players during registration process
 */
export async function checkClaimablePlayersForEmail(
  email: string
): Promise<{
  success: boolean;
  players: Array<Player & { 
    canClaim: boolean; 
    claimError?: string;
    gamesPlayed: number;
    currentRating: number;
  }>;
  totalFound: number;
  error?: string;
}> {
  try {
    console.log('🔍 Checking for claimable phantom players for email:', email);
    logger.info(`Checking for claimable phantom players for email: ${email}`);
    
    const result = await findClaimablePlayersForUser(email);
    console.log('🎭 Found claimable players result:', result);
    
    logger.info(`Found ${result.totalFound} claimable players for ${email}`);
    
    return {
      success: true,
      players: result.players,
      totalFound: result.totalFound
    };
  } catch (error) {
    console.error('💥 Error checking claimable players:', error);
    logger.error('Error checking claimable players for email:', error);
    
    // Check if it's a network error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNetworkError = errorMessage.includes('network') || 
                          errorMessage.includes('offline') || 
                          errorMessage.includes('connection');
    
    return {
      success: false,
      players: [],
      totalFound: 0,
      error: isNetworkError ? 'Network connection lost. Please check your internet connection and try again.' : 'Failed to check for claimable players'
    };
  }
}

/**
 * Step 2: Register user with optional phantom player claiming
 */
export async function registerUserWithPhantomClaiming(
  registrationData: RegistrationWithClaimingRequest
): Promise<RegistrationWithClaimingResponse> {
  try {
    const { email, password, name, role = 'player', claimPlayerIds = [] } = registrationData;
    
    logger.info('Starting enhanced user registration with phantom claiming', { 
      email, 
      name, 
      role,
      claimPlayerCount: claimPlayerIds.length 
    });

    // Step 1: Create the Firebase user account
    console.log('🔥 Creating Firebase user account...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    logger.info('Firebase user created successfully', { uid: firebaseUser.uid });

    // Step 2: Update user profile
    console.log('📝 Updating user profile...');
    await updateProfile(firebaseUser, { displayName: name });
    logger.info('User profile updated', { uid: firebaseUser.uid, displayName: name });

    // Step 3: Send email verification
    console.log('📧 Sending email verification...');
    await sendEmailVerification(firebaseUser);
    logger.info('Email verification sent', { uid: firebaseUser.uid, email: firebaseUser.email });

    // Step 4: Create user document in Firestore
    console.log('💾 Creating user document in Firestore...');
    const user = await createUserDocument(firebaseUser, { name, role });
    logger.info('User document created successfully', { uid: firebaseUser.uid });

    // Step 5: Claim phantom players if requested
    let claimingResults;
    if (claimPlayerIds.length > 0) {
      console.log(`🎭 Claiming ${claimPlayerIds.length} phantom players...`);
      
      claimingResults = await bulkClaimPlayers(
        firebaseUser.uid,
        email,
        claimPlayerIds
      );
      
      logger.info('Phantom player claiming completed', {
        userId: firebaseUser.uid,
        claimedCount: claimingResults.claimedCount,
        failedCount: claimingResults.failed.length
      });
    }

    // Log completion audit event
    const playersClaimed = claimingResults?.claimedCount || 0;
    const totalGamesInherited = claimingResults?.claimedPlayers?.reduce(
      (total: number, player: any) => total + (player.wins || 0) + (player.losses || 0), 
      0
    ) || 0;
    
    await logUserOnboardingCompleted(
      firebaseUser.uid,
      playersClaimed,
      0, // circles joined - will be updated in invitation flow
      totalGamesInherited
    );

    return {
      success: true,
      user,
      claimingResults,
    };

  } catch (error: any) {
    logger.error('Enhanced registration error', {
      errorCode: error.code,
      errorMessage: error.message,
      email: registrationData.email
    });
    
    return {
      success: false,
      error: getRegistrationErrorMessage(error.code || 'unknown')
    };
  }
}

/**
 * Complete registration flow: check for players, then register with claiming
 */
export async function completeRegistrationWithClaiming(
  email: string,
  password: string,
  name: string,
  selectedPlayerIds: string[] = [],
  role: UserRole = 'player'
): Promise<RegistrationWithClaimingResponse> {
  try {
    logger.info('Starting complete registration with claiming flow', {
      email,
      name,
      selectedPlayerCount: selectedPlayerIds.length
    });

    // First, check what players are available for claiming
    const claimableCheck = await checkClaimablePlayersForEmail(email);
    
    if (!claimableCheck.success) {
      return {
        success: false,
        error: claimableCheck.error || 'Failed to check for claimable players'
      };
    }

    // If no players found, proceed with normal registration
    if (claimableCheck.totalFound === 0) {
      logger.info('No claimable players found, proceeding with normal registration');
      
      return await registerUserWithPhantomClaiming({
        email,
        password,
        name,
        role
      });
    }

    // If players found but none selected, return player selection requirement
    if (selectedPlayerIds.length === 0) {
      logger.info(`Found ${claimableCheck.totalFound} claimable players, requiring selection`);
      
      return {
        success: true,
        requiresPlayerSelection: true,
        claimablePhantomPlayers: claimableCheck.players,
        error: 'Player selection required'
      };
    }

    // Register with selected players
    logger.info(`Registering user with ${selectedPlayerIds.length} selected phantom players`);
    
    return await registerUserWithPhantomClaiming({
      email,
      password,
      name,
      role,
      claimPlayerIds: selectedPlayerIds
    });

  } catch (error) {
    logger.error('Error in complete registration with claiming:', error);
    return {
      success: false,
      error: 'Registration failed due to system error'
    };
  }
}

/**
 * Post-registration claiming for users who want to claim players later
 */
export async function claimPlayersPostRegistration(
  userId: string,
  email: string,
  playerIds: string[]
): Promise<{
  success: boolean;
  claimedCount: number;
  failed: Array<{ playerId: string; error: string }>;
  error?: string;
}> {
  try {
    logger.info(`Post-registration claiming for user ${userId}`, {
      email,
      playerCount: playerIds.length
    });

    const result = await bulkClaimPlayers(userId, email, playerIds);
    
    logger.info('Post-registration claiming completed', {
      userId,
      claimedCount: result.claimedCount,
      failedCount: result.failed.length
    });

    return {
      success: result.success,
      claimedCount: result.claimedCount,
      failed: result.failed
    };

  } catch (error) {
    logger.error('Error in post-registration claiming:', error);
    return {
      success: false,
      claimedCount: 0,
      failed: [],
      error: 'Post-registration claiming failed'
    };
  }
}

/**
 * Check if user's email has unclaimed phantom players (for dashboard notifications)
 */
export async function checkUnclaimedPlayersForUser(
  userEmail: string
): Promise<{
  hasUnclaimed: boolean;
  unclaimedCount: number;
  players: Array<Player & { 
    gamesPlayed: number;
    currentRating: number;
  }>;
}> {
  try {
    const claimableCheck = await findClaimablePlayersForUser(userEmail);
    
    const unclaimedPlayers = claimableCheck.players.filter(p => p.canClaim);
    
    return {
      hasUnclaimed: unclaimedPlayers.length > 0,
      unclaimedCount: unclaimedPlayers.length,
      players: unclaimedPlayers
    };

  } catch (error) {
    logger.error('Error checking unclaimed players for user:', error);
    return {
      hasUnclaimed: false,
      unclaimedCount: 0,
      players: []
    };
  }
}

/**
 * Enhanced sign-in that checks for claimable players
 */
export async function signInUserWithPlayerCheck(
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: User;
  hasClaimablePlayers?: boolean;
  claimableCount?: number;
  error?: string;
}> {
  try {
    logger.info('Enhanced sign-in with player check', { email });

    // First, perform standard sign-in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Check if email is verified
    if (!firebaseUser.emailVerified) {
      return {
        success: false,
        error: 'Please verify your email address before signing in. Check your inbox for a verification email.'
      };
    }

    // Get user document (this would normally be done in standard sign-in)
    const user = await getUserDocumentFromFirebase(firebaseUser);
    if (!user) {
      return {
        success: false,
        error: 'User account not found'
      };
    }

    // Check for claimable phantom players
    const claimableCheck = await checkUnclaimedPlayersForUser(email);

    return {
      success: true,
      user,
      hasClaimablePlayers: claimableCheck.hasUnclaimed,
      claimableCount: claimableCheck.unclaimedCount
    };

  } catch (error: any) {
    logger.error('Enhanced sign-in error:', error);
    return {
      success: false,
      error: getRegistrationErrorMessage(error.code)
    };
  }
}

/**
 * Helper function to get user document from Firebase user
 */
async function getUserDocumentFromFirebase(firebaseUser: any): Promise<User | null> {
  // This would typically import and use the existing getUserDocument function
  // For now, creating a minimal implementation
  try {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      role: 'player' as UserRole,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error creating user document from Firebase user:', error);
    return null;
  }
}

/**
 * Registration analytics for admin dashboard
 */
export async function getRegistrationAnalytics(days: number = 30): Promise<{
  totalRegistrations: number;
  registrationsWithClaiming: number;
  averageClaimsPerRegistration: number;
  topDays: Array<{ date: string; registrations: number; claims: number }>;
}> {
  try {
    // This would query Firebase for registration and claiming data
    // Implementation would depend on how we track registration events
    logger.info(`Getting registration analytics for ${days} days`);
    
    // Placeholder implementation - would be replaced with actual queries
    return {
      totalRegistrations: 0,
      registrationsWithClaiming: 0,
      averageClaimsPerRegistration: 0,
      topDays: []
    };

  } catch (error) {
    logger.error('Error getting registration analytics:', error);
    return {
      totalRegistrations: 0,
      registrationsWithClaiming: 0,
      averageClaimsPerRegistration: 0,
      topDays: []
    };
  }
}

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
function getRegistrationErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Registration failed. Please try again.';
  }
}

/**
 * Validate registration data before processing
 */
export function validateRegistrationData(
  email: string,
  password: string,
  name: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  // Name validation
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}