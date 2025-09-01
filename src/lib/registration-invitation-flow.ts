import { 
  checkClaimablePlayersForEmail,
  registerUserWithPhantomClaiming,
  completeRegistrationWithClaiming
} from './enhanced-registration';
import {
  getPendingEmailInvitesForEmail,
  convertEmailInvitesToUserInvites,
  acceptEmailInvitation
} from './enhanced-circle-invites';
import { logger } from './logger';
import type { 
  User, 
  UserRole, 
  EmailCircleInvite, 
  Player,
  RegistrationWithClaimingResponse 
} from './types';

/**
 * Complete Registration and Invitation Redemption Flow
 * 
 * This module orchestrates the complete user onboarding experience,
 * handling phantom player claiming and circle invitation redemption
 * in a seamless registration flow.
 */

export interface CompleteOnboardingRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  // Player claiming options
  selectedPlayerIds?: string[];
  skipPlayerClaiming?: boolean;
  // Circle invitation options
  acceptInvitations?: string[]; // Email invitation IDs to accept
  declineInvitations?: string[]; // Email invitation IDs to decline
  deferInvitations?: boolean; // Handle invitations after registration
}

export interface CompleteOnboardingResponse {
  success: boolean;
  user?: User;
  error?: string;
  
  // Player claiming results
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
  
  // Circle invitation results
  pendingCircleInvitations?: EmailCircleInvite[];
  invitationResults?: {
    acceptedCount: number;
    declinedCount: number;
    conversionResults?: any;
    failed: Array<{ inviteId: string; error: string }>;
  };
  
  // Flow control
  requiresPlayerSelection?: boolean;
  requiresInvitationResponse?: boolean;
  
  // Onboarding summary
  onboardingSummary?: {
    circlesJoined: number;
    playersClaimedWithStats: Array<{
      playerName: string;
      rating: number;
      gamesPlayed: number;
    }>;
    totalGamesInherited: number;
  };
}

/**
 * Step 1: Check what's available for the user's email before registration
 */
export async function checkOnboardingOpportunities(
  email: string
): Promise<{
  success: boolean;
  claimablePlayers: Array<Player & { 
    canClaim: boolean; 
    gamesPlayed: number;
    currentRating: number;
  }>;
  pendingInvitations: EmailCircleInvite[];
  totalOpportunities: number;
  error?: string;
}> {
  try {
    logger.info(`Checking onboarding opportunities for email: ${email}`);

    // Check for phantom players and circle invitations in parallel
    const [playersCheck, invitationsCheck] = await Promise.all([
      checkClaimablePlayersForEmail(email),
      getPendingEmailInvitesForEmail(email)
    ]);

    if (!playersCheck.success) {
      return {
        success: false,
        claimablePlayers: [],
        pendingInvitations: [],
        totalOpportunities: 0,
        error: playersCheck.error
      };
    }

    const totalOpportunities = playersCheck.totalFound + invitationsCheck.length;

    logger.info(`Found ${playersCheck.totalFound} claimable players and ${invitationsCheck.length} pending invitations for ${email}`);

    return {
      success: true,
      claimablePlayers: playersCheck.players,
      pendingInvitations: invitationsCheck,
      totalOpportunities
    };

  } catch (error) {
    logger.error('Error checking onboarding opportunities:', error);
    return {
      success: false,
      claimablePlayers: [],
      pendingInvitations: [],
      totalOpportunities: 0,
      error: 'Failed to check onboarding opportunities'
    };
  }
}

/**
 * Step 2: Complete onboarding with player claiming and invitation handling
 */
export async function completeUserOnboarding(
  onboardingRequest: CompleteOnboardingRequest
): Promise<CompleteOnboardingResponse> {
  try {
    const { 
      email, 
      password, 
      name, 
      role = 'player',
      selectedPlayerIds = [],
      skipPlayerClaiming = false,
      acceptInvitations = [],
      declineInvitations = [],
      deferInvitations = false
    } = onboardingRequest;

    logger.info('Starting complete user onboarding', {
      email,
      name,
      role,
      playerCount: selectedPlayerIds.length,
      invitationCount: acceptInvitations.length + declineInvitations.length,
      deferInvitations
    });

    // Step 1: Register user with phantom player claiming
    const registrationResult = await registerUserWithPhantomClaiming({
      email,
      password,
      name,
      role,
      claimPlayerIds: skipPlayerClaiming ? [] : selectedPlayerIds
    });

    if (!registrationResult.success || !registrationResult.user) {
      return {
        success: false,
        error: registrationResult.error || 'Registration failed'
      };
    }

    const user = registrationResult.user;
    const response: CompleteOnboardingResponse = {
      success: true,
      user,
      claimingResults: registrationResult.claimingResults
    };

    // Step 2: Handle circle invitations if not deferred
    if (!deferInvitations && (acceptInvitations.length > 0 || declineInvitations.length > 0)) {
      const invitationResults = await handleCircleInvitationsDuringOnboarding(
        user.id,
        email,
        acceptInvitations,
        declineInvitations
      );
      
      response.invitationResults = invitationResults;
    }

    // Step 3: Convert remaining email invitations to user invitations
    const conversionResults = await convertEmailInvitesToUserInvites(email, user.id);
    
    if (response.invitationResults) {
      response.invitationResults.conversionResults = conversionResults;
    } else {
      response.invitationResults = {
        acceptedCount: 0,
        declinedCount: 0,
        conversionResults,
        failed: []
      };
    }

    // Step 4: Generate onboarding summary
    response.onboardingSummary = await generateOnboardingSummary(
      user.id,
      registrationResult.claimingResults,
      response.invitationResults
    );

    logger.info('User onboarding completed successfully', {
      userId: user.id,
      claimedPlayers: response.claimingResults?.claimedCount || 0,
      joinedCircles: response.invitationResults?.acceptedCount || 0
    });

    return response;

  } catch (error) {
    logger.error('Error in complete user onboarding:', error);
    return {
      success: false,
      error: 'Onboarding failed due to system error'
    };
  }
}

/**
 * Handle circle invitations during onboarding
 */
async function handleCircleInvitationsDuringOnboarding(
  userId: string,
  email: string,
  acceptInvitations: string[],
  declineInvitations: string[]
): Promise<{
  acceptedCount: number;
  declinedCount: number;
  failed: Array<{ inviteId: string; error: string }>;
}> {
  const result = {
    acceptedCount: 0,
    declinedCount: 0,
    failed: [] as Array<{ inviteId: string; error: string }>
  };

  try {
    logger.info(`Handling ${acceptInvitations.length} acceptances and ${declineInvitations.length} declines for user ${userId}`);

    // Handle acceptances
    for (const inviteId of acceptInvitations) {
      try {
        const acceptResult = await acceptEmailInvitation(inviteId, userId);
        if (acceptResult.success) {
          result.acceptedCount++;
        } else {
          result.failed.push({ inviteId, error: acceptResult.message });
        }
      } catch (error) {
        result.failed.push({ inviteId, error: `Accept failed: ${error}` });
      }
    }

    // Handle declines
    for (const inviteId of declineInvitations) {
      try {
        const { declineEmailInvitation } = await import('./enhanced-circle-invites');
        const declineResult = await declineEmailInvitation(inviteId, userId);
        if (declineResult.success) {
          result.declinedCount++;
        } else {
          result.failed.push({ inviteId, error: declineResult.message });
        }
      } catch (error) {
        result.failed.push({ inviteId, error: `Decline failed: ${error}` });
      }
    }

    return result;

  } catch (error) {
    logger.error('Error handling circle invitations during onboarding:', error);
    return {
      acceptedCount: 0,
      declinedCount: 0,
      failed: [...acceptInvitations, ...declineInvitations].map(id => ({ 
        inviteId: id, 
        error: 'System error' 
      }))
    };
  }
}

/**
 * Generate onboarding summary for user dashboard
 */
async function generateOnboardingSummary(
  userId: string,
  claimingResults?: { claimedCount: number; failed: Array<{ playerId: string; error: string }> },
  invitationResults?: { acceptedCount: number; declinedCount: number; failed: Array<any> }
): Promise<{
  circlesJoined: number;
  playersClaimedWithStats: Array<{
    playerName: string;
    rating: number;
    gamesPlayed: number;
  }>;
  totalGamesInherited: number;
}> {
  try {
    const summary = {
      circlesJoined: invitationResults?.acceptedCount || 0,
      playersClaimedWithStats: [] as Array<{
        playerName: string;
        rating: number;
        gamesPlayed: number;
      }>,
      totalGamesInherited: 0
    };

    // Get details of claimed players
    if (claimingResults && claimingResults.claimedCount > 0) {
      const { getPlayersByClaimedUser } = await import('./player-claiming');
      const claimedPlayers = await getPlayersByClaimedUser(userId);

      // For each claimed player, get their game statistics
      for (const player of claimedPlayers) {
        const totalGames = player.wins + player.losses;
        
        summary.playersClaimedWithStats.push({
          playerName: player.name,
          rating: player.rating,
          gamesPlayed: totalGames
        });
        
        summary.totalGamesInherited += totalGames;
      }
    }

    return summary;

  } catch (error) {
    logger.error('Error generating onboarding summary:', error);
    return {
      circlesJoined: 0,
      playersClaimedWithStats: [],
      totalGamesInherited: 0
    };
  }
}

/**
 * Post-registration invitation handling for users who deferred
 */
export async function handleDeferredInvitations(
  userId: string,
  email: string,
  acceptInvitations: string[] = [],
  declineInvitations: string[] = []
): Promise<{
  success: boolean;
  acceptedCount: number;
  declinedCount: number;
  failed: Array<{ inviteId: string; error: string }>;
  error?: string;
}> {
  try {
    logger.info(`Handling deferred invitations for user ${userId}`, {
      acceptCount: acceptInvitations.length,
      declineCount: declineInvitations.length
    });

    const result = await handleCircleInvitationsDuringOnboarding(
      userId,
      email,
      acceptInvitations,
      declineInvitations
    );

    return {
      success: true,
      ...result
    };

  } catch (error) {
    logger.error('Error handling deferred invitations:', error);
    return {
      success: false,
      acceptedCount: 0,
      declinedCount: 0,
      failed: [],
      error: 'Failed to handle deferred invitations'
    };
  }
}

/**
 * Get user's onboarding status for dashboard display
 */
export async function getUserOnboardingStatus(
  userId: string,
  userEmail: string
): Promise<{
  hasCompletedOnboarding: boolean;
  pendingPlayerClaims: number;
  pendingCircleInvitations: number;
  onboardingScore: number; // 0-100 based on completed actions
  suggestions: Array<{
    type: 'claim-players' | 'join-circles' | 'complete-profile';
    message: string;
    actionUrl?: string;
  }>;
}> {
  try {
    logger.info(`Getting onboarding status for user ${userId}`);

    // Check for pending opportunities
    const [playersCheck, invitationsCheck] = await Promise.all([
      checkClaimablePlayersForEmail(userEmail),
      getPendingEmailInvitesForEmail(userEmail)
    ]);

    const pendingPlayerClaims = playersCheck.success ? playersCheck.totalFound : 0;
    const pendingCircleInvitations = invitationsCheck.length;

    // Calculate onboarding score (simplified)
    let score = 50; // Base score for having an account
    if (pendingPlayerClaims === 0) score += 25; // No pending claims
    if (pendingCircleInvitations === 0) score += 25; // No pending invitations

    const hasCompletedOnboarding = score === 100;

    // Generate suggestions
    const suggestions: Array<{
      type: 'claim-players' | 'join-circles' | 'complete-profile';
      message: string;
      actionUrl?: string;
    }> = [];

    if (pendingPlayerClaims > 0) {
      suggestions.push({
        type: 'claim-players',
        message: `You have ${pendingPlayerClaims} player profile${pendingPlayerClaims > 1 ? 's' : ''} waiting to be claimed`,
        actionUrl: '/claim-players'
      });
    }

    if (pendingCircleInvitations > 0) {
      suggestions.push({
        type: 'join-circles',
        message: `You have ${pendingCircleInvitations} circle invitation${pendingCircleInvitations > 1 ? 's' : ''} pending`,
        actionUrl: '/invitations'
      });
    }

    return {
      hasCompletedOnboarding,
      pendingPlayerClaims,
      pendingCircleInvitations,
      onboardingScore: score,
      suggestions
    };

  } catch (error) {
    logger.error('Error getting user onboarding status:', error);
    return {
      hasCompletedOnboarding: false,
      pendingPlayerClaims: 0,
      pendingCircleInvitations: 0,
      onboardingScore: 0,
      suggestions: []
    };
  }
}

/**
 * Complete onboarding flow with guided experience
 */
export async function completeGuidedOnboarding(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'player'
): Promise<CompleteOnboardingResponse> {
  try {
    logger.info('Starting guided onboarding flow', { email, name, role });

    // Step 1: Check opportunities
    const opportunities = await checkOnboardingOpportunities(email);
    
    if (!opportunities.success) {
      return {
        success: false,
        error: opportunities.error
      };
    }

    // Step 2: If no opportunities, do simple registration
    if (opportunities.totalOpportunities === 0) {
      const registrationResult = await registerUserWithPhantomClaiming({
        email,
        password,
        name,
        role
      });

      return {
        success: registrationResult.success,
        user: registrationResult.user,
        error: registrationResult.error,
        onboardingSummary: {
          circlesJoined: 0,
          playersClaimedWithStats: [],
          totalGamesInherited: 0
        }
      };
    }

    // Step 3: Present opportunities for user selection
    return {
      success: true,
      requiresPlayerSelection: opportunities.claimablePlayers.length > 0,
      requiresInvitationResponse: opportunities.pendingInvitations.length > 0,
      claimablePhantomPlayers: opportunities.claimablePlayers,
      pendingCircleInvitations: opportunities.pendingInvitations
    };

  } catch (error) {
    logger.error('Error in guided onboarding flow:', error);
    return {
      success: false,
      error: 'Guided onboarding failed due to system error'
    };
  }
}