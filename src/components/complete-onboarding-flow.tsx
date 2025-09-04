'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Users, 
  ChevronRight, 
  CheckCircle, 
  Gift,
  Star,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import PhantomPlayerClaiming from './phantom-player-claiming';
import CircleInvitationHandler from './circle-invitation-handler';
import type { Player, EmailCircleInvite } from '@/lib/types';

interface ClaimablePlayer extends Player {
  canClaim: boolean;
  claimError?: string;
  gamesPlayed: number;
  currentRating: number;
}

type OnboardingStep = 'welcome' | 'claiming' | 'invitations' | 'processing' | 'complete';

interface CompleteOnboardingFlowProps {
  claimablePlayers: ClaimablePlayer[];
  pendingInvitations: EmailCircleInvite[];
  onComplete: (selectedPlayers: string[], acceptedInvitations: string[], declinedInvitations: string[]) => void;
  onSkip: () => void;
  isLoading?: boolean;
  className?: string;
}

interface OnboardingState {
  selectedPlayers: string[];
  acceptedInvitations: string[];
  declinedInvitations: string[];
}

export function CompleteOnboardingFlow({
  claimablePlayers,
  pendingInvitations,
  onComplete,
  onSkip,
  isLoading = false,
  className
}: CompleteOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    selectedPlayers: [],
    acceptedInvitations: [],
    declinedInvitations: []
  });

  const hasPlayers = claimablePlayers.length > 0;
  const hasInvitations = pendingInvitations.length > 0;
  const totalOpportunities = claimablePlayers.length + pendingInvitations.length;

  const handleStartOnboarding = () => {
    if (hasPlayers) {
      setCurrentStep('claiming');
    } else if (hasInvitations) {
      setCurrentStep('invitations');
    } else {
      handleComplete();
    }
  };

  const handlePlayersSelected = (selectedPlayerIds: string[]) => {
    console.log('🎭 Players selected in onboarding flow:', selectedPlayerIds);
    console.log('🔄 Current onboarding state before update:', onboardingState);
    setOnboardingState(prev => {
      const newState = {
        ...prev,
        selectedPlayers: selectedPlayerIds
      };
      console.log('📝 Updated onboarding state:', newState);
      return newState;
    });
    
    if (hasInvitations) {
      console.log('📨 Moving to invitations step, players stored for later');
      setCurrentStep('invitations');
    } else {
      console.log('🏁 No invitations, completing immediately with selected players');
      // Pass the selected players directly instead of relying on state
      handleCompleteWithPlayers(selectedPlayerIds);
    }
  };

  const handleInvitationsHandled = (acceptedIds: string[], declinedIds: string[]) => {
    console.log('📨 Invitations handled:', { acceptedIds, declinedIds });
    setOnboardingState(prev => ({
      ...prev,
      acceptedInvitations: acceptedIds,
      declinedInvitations: declinedIds
    }));
    
    // Use direct parameter passing to avoid state timing issues
    handleCompleteWithData(undefined, acceptedIds, declinedIds);
  };

  const handleComplete = () => {
    setCurrentStep('processing');
    onComplete(
      onboardingState.selectedPlayers,
      onboardingState.acceptedInvitations,
      onboardingState.declinedInvitations
    );
  };

  // Unified completion function that accepts all data directly to avoid state timing issues
  const handleCompleteWithData = (
    selectedPlayerIds?: string[],
    acceptedInvitationIds?: string[],
    declinedInvitationIds?: string[]
  ) => {
    console.log('🎯 handleCompleteWithData called with:', {
      selectedPlayerIds,
      acceptedInvitationIds, 
      declinedInvitationIds,
      currentState: onboardingState
    });
    
    setCurrentStep('processing');
    const finalSelectedPlayers = selectedPlayerIds ?? onboardingState.selectedPlayers;
    const finalAcceptedInvitations = acceptedInvitationIds ?? onboardingState.acceptedInvitations;
    const finalDeclinedInvitations = declinedInvitationIds ?? onboardingState.declinedInvitations;
    
    console.log('🏁 Final data being passed to onComplete:', {
      selectedPlayers: finalSelectedPlayers,
      acceptedInvitations: finalAcceptedInvitations,
      declinedInvitations: finalDeclinedInvitations
    });
    
    onComplete(
      finalSelectedPlayers,
      finalAcceptedInvitations,
      finalDeclinedInvitations
    );
  };

  const handleCompleteWithPlayers = (selectedPlayerIds: string[]) => {
    handleCompleteWithData(selectedPlayerIds);
  };

  const handleSkipPlayers = () => {
    if (hasInvitations) {
      setCurrentStep('invitations');
    } else {
      onSkip();
    }
  };

  const handleSkipInvitations = () => {
    console.log('⏭️ Skipping invitations, completing with selected players only');
    // When skipping invitations, use the current state but ensure we preserve selected players
    handleCompleteWithData();
  };

  const getProgress = () => {
    switch (currentStep) {
      case 'welcome': return 0;
      case 'claiming': return hasInvitations ? 33 : 50;
      case 'invitations': return hasPlayers ? 66 : 50;
      case 'processing': return 90;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const totalGames = claimablePlayers.reduce((sum, player) => sum + player.gamesPlayed, 0);

  // No opportunities - simple registration
  if (totalOpportunities === 0) {
    return null;
  }

  return (
    <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Complete Your Account Setup</CardTitle>
              <CardDescription>
                We found some great opportunities to enhance your account
              </CardDescription>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              Step {currentStep === 'welcome' ? 1 : currentStep === 'claiming' ? 2 : currentStep === 'invitations' ? 3 : 4} of {hasPlayers && hasInvitations ? 4 : 3}
            </Badge>
          </div>
          <div className="mt-4">
            <Progress value={getProgress()} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      {currentStep === 'welcome' && (
        <WelcomeStep
          claimablePlayers={claimablePlayers}
          pendingInvitations={pendingInvitations}
          totalGames={totalGames}
          onStart={handleStartOnboarding}
          onSkip={onSkip}
        />
      )}

      {currentStep === 'claiming' && hasPlayers && (
        <PhantomPlayerClaiming
          claimablePlayers={claimablePlayers}
          onPlayersSelected={handlePlayersSelected}
          onSkip={handleSkipPlayers}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'invitations' && hasInvitations && (
        <CircleInvitationHandler
          pendingInvitations={pendingInvitations}
          onInvitationsHandled={handleInvitationsHandled}
          onSkip={handleSkipInvitations}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'processing' && (
        <ProcessingStep
          selectedPlayers={onboardingState.selectedPlayers}
          acceptedInvitations={onboardingState.acceptedInvitations}
          claimablePlayers={claimablePlayers}
          pendingInvitations={pendingInvitations}
        />
      )}
    </div>
  );
}

interface WelcomeStepProps {
  claimablePlayers: ClaimablePlayer[];
  pendingInvitations: EmailCircleInvite[];
  totalGames: number;
  onStart: () => void;
  onSkip: () => void;
}

function WelcomeStep({
  claimablePlayers,
  pendingInvitations,
  totalGames,
  onStart,
  onSkip
}: WelcomeStepProps) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full">
            <Gift className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-2xl text-amber-900 dark:text-amber-100">
              Welcome! We have some surprises for you
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300 text-lg">
              Your email address is connected to some exciting opportunities
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Player Claiming Opportunity */}
          {claimablePlayers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Game History Found!</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  We found {claimablePlayers.length} player profile{claimablePlayers.length > 1 ? 's' : ''} 
                  {' '}with your email address
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Games</span>
                    <Badge variant="secondary">{totalGames}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Profiles Available</span>
                    <Badge variant="secondary">{claimablePlayers.length}</Badge>
                  </div>
                </div>
                <Alert>
                  <Star className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Claim these profiles to inherit all your game statistics and rating history!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Circle Invitations */}
          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Circle Invitations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  You have {pendingInvitations.length} pending circle invitation{pendingInvitations.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-2">
                  {pendingInvitations.slice(0, 2).map((invitation, index) => (
                    <div key={invitation.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{invitation.circle?.name || 'Circle'}</span>
                      <Badge variant="outline" className="text-xs">
                        {invitation.circle?.memberCount || 0} members
                      </Badge>
                    </div>
                  ))}
                  {pendingInvitations.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{pendingInvitations.length - 2} more...
                    </div>
                  )}
                </div>
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Join circles to connect with other players and participate in organized games!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-medium">Ready to enhance your account?</div>
            <div className="text-sm text-muted-foreground">
              This will take just a few minutes and you can skip any step
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onSkip}>
              Skip Setup
            </Button>
            <Button onClick={onStart} className="bg-amber-600 hover:bg-amber-700">
              Let's Get Started
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProcessingStepProps {
  selectedPlayers: string[];
  acceptedInvitations: string[];
  claimablePlayers: ClaimablePlayer[];
  pendingInvitations: EmailCircleInvite[];
}

function ProcessingStep({
  selectedPlayers,
  acceptedInvitations,
  claimablePlayers,
  pendingInvitations
}: ProcessingStepProps) {
  const claimedPlayerNames = claimablePlayers
    .filter(p => selectedPlayers.includes(p.id))
    .map(p => p.name);
  
  const joinedCircleNames = pendingInvitations
    .filter(inv => acceptedInvitations.includes(inv.id))
    .map(inv => inv.circle?.name || 'Circle');

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-2xl text-blue-900 dark:text-blue-100">
              Setting up your account...
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300 text-lg">
              We're processing your selections and setting everything up
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          {selectedPlayers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Claiming Player Profiles</span>
              </div>
              <div className="ml-6 space-y-1">
                {claimedPlayerNames.map((name, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {acceptedInvitations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-medium">Joining Circles</span>
              </div>
              <div className="ml-6 space-y-1">
                {joinedCircleNames.map((name, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompleteOnboardingFlow;