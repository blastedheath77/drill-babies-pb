'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { CompleteOnboardingFlow } from '@/components/complete-onboarding-flow';
import { bulkClaimPlayers } from '@/lib/player-claiming';
import { toast } from '@/hooks/use-toast';
import type { ClaimablePlayer } from '@/lib/auth-types';
import Link from 'next/link';
import React from 'react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [claimablePhantomPlayers, setClaimablePhantomPlayers] = useState<ClaimablePlayer[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const { register, registerWithPhantomCheck, user } = useAuth();
  const router = useRouter();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting enhanced registration with:', { 
        email: formData.email, 
        name: formData.name.trim() 
      });
      
      const result = await registerWithPhantomCheck(formData.email, formData.password, formData.name.trim());
      
      console.log('🎯 Enhanced registration result:', { 
        success: result.success, 
        hasUser: !!result.user,
        userId: result.user?.id,
        requiresOnboarding: result.requiresOnboarding,
        claimablePhantomPlayers: result.claimablePhantomPlayers?.length,
        error: result.error
      });
      
      if (result.success) {
        // Store user ID for claiming
        if (result.user?.id) {
          console.log('💾 Storing registered user ID:', result.user.id);
          setRegisteredUserId(result.user.id);
        } else {
          console.error('⚠️ No user ID in registration result:', result.user);
        }
        
        if (result.requiresOnboarding && result.claimablePhantomPlayers?.length) {
          // Show onboarding flow for phantom player claiming
          console.log('🎭 Found phantom players, showing onboarding flow. Players:', result.claimablePhantomPlayers);
          setClaimablePhantomPlayers(result.claimablePhantomPlayers);
          setShowOnboarding(true);
        } else {
          // Standard registration success
          console.log('✅ Registration successful without phantom players');
          setSuccess('Account created successfully! Please check your email and click the verification link before signing in.');
          // Redirect to login after 2 seconds
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      } else {
        console.error('Registration failed:', result.error);
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error in component:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Check for network errors
      if (errorMessage.includes('network') || 
          errorMessage.includes('offline') || 
          errorMessage.includes('connection') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('fetch')) {
        setError('Network connection lost. Please check your internet connection and try again.');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleOnboardingComplete = async (selectedPlayers: string[], acceptedInvitations: string[], declinedInvitations: string[]) => {
    setIsLoading(true);
    try {
      console.log('🎯 Starting onboarding completion with:', {
        selectedPlayers,
        registeredUserId,
        userId: user?.id,
        email: formData.email
      });

      if (selectedPlayers.length > 0 && (registeredUserId || user?.id)) {
        // Claim the selected phantom players
        const userId = registeredUserId || user?.id;
        console.log('👤 Using userId for claiming:', userId);
        
        if (userId) {
          console.log('🔄 Calling bulkClaimPlayers with:', { userId, email: formData.email, playerIds: selectedPlayers });
          const claimResults = await bulkClaimPlayers(userId, formData.email, selectedPlayers);
          console.log('📋 Claim results:', claimResults);
          
          if (claimResults.success) {
            toast({
              title: 'Success!',
              description: `Successfully claimed ${claimResults.claimedCount} phantom player(s)!`
            });
          }
          
          if (claimResults.failed && claimResults.failed.length > 0) {
            console.error('❌ Some claims failed:', claimResults.failed);
            toast({
              variant: 'destructive',
              title: 'Some claims failed',
              description: `Failed to claim ${claimResults.failed.length} player(s)`
            });
          }

          if (claimResults.errors && claimResults.errors.length > 0) {
            console.error('💥 Claiming errors:', claimResults.errors);
          }
        } else {
          console.error('❌ No user ID available for claiming');
        }
      } else {
        console.log('⏭️ Skipping claiming - no players selected or no user ID');
      }

      setOnboardingComplete(true);
      setShowOnboarding(false);
      setSuccess('Account created successfully! Please check your email and click the verification link before signing in.');
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Error during onboarding completion:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete onboarding process'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setOnboardingComplete(true);
    setSuccess('Account created successfully! Please check your email and click the verification link before signing in.');
    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  // Show onboarding flow if phantom players found
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 p-4">
        <div className="w-full max-w-4xl">
          <CompleteOnboardingFlow
            claimablePlayers={claimablePhantomPlayers}
            pendingInvitations={[]} // No invitations during registration
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <Icons.PickleballPaddle className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">PBStats</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join the Pickleball Stats community and start tracking your games
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange('name')}
                required
                disabled={isLoading}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                required
                disabled={isLoading}
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                required
                disabled={isLoading}
                placeholder="Enter your password"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                required
                disabled={isLoading}
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6">
            <Separator />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}