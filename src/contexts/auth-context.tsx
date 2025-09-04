'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContextType, User } from '@/lib/auth-types';
import { 
  signInUser, 
  signOutUser, 
  registerUser, 
  onAuthStateChange,
  resetPassword,
  resendEmailVerification
} from '@/lib/user-management';
import { 
  checkClaimablePlayersForEmail, 
  completeRegistrationWithClaiming 
} from '@/lib/enhanced-registration';
import type { Player } from '@/lib/types';
import { getUserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Use Firebase Auth only - no localStorage fallback
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        logger.info('User signed in via Firebase', { uid: firebaseUser.id, email: firebaseUser.email });
      }
      
      setIsLoading(false);
      setIsInitialized(true);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const result = await signInUser(email, password);
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      logger.error('Login error in context', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    
    try {
      const result = await registerUser(email, password, name);
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      logger.error('Registration error in context', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithPhantomCheck = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    
    try {
      console.log('🚀 Starting registerWithPhantomCheck for:', email);
      
      // Step 1: Check for phantom players first
      console.log('🚀 Starting phantom player check for:', email);
      const phantomCheck = await checkClaimablePlayersForEmail(email);
      console.log('🔍 Phantom player check result:', { 
        success: phantomCheck.success, 
        totalFound: phantomCheck.totalFound, 
        playerCount: phantomCheck.players?.length,
        error: phantomCheck.error,
        players: phantomCheck.players?.map(p => ({ id: p.id, name: p.name, email: p.email, canClaim: p.canClaim }))
      });
      
      // Step 2: Create user account regardless of phantom player status
      const userResult = await registerUser(email, password, name);
      console.log('👤 User creation result:', userResult);
      
      if (!userResult.success) {
        return { success: false, error: userResult.error };
      }
      
      if (userResult.user) {
        console.log('👤 Setting user in auth context:', { id: userResult.user.id, email: userResult.user.email, name: userResult.user.name });
        setUser(userResult.user);
      }
      
      // Step 3: If phantom players found, show onboarding flow
      console.log('🤔 Checking phantom player condition:', { 
        phantomSuccess: phantomCheck.success, 
        totalFound: phantomCheck.totalFound,
        playersLength: phantomCheck.players?.length,
        shouldShowOnboarding: phantomCheck.success && phantomCheck.totalFound > 0
      });
      
      if (phantomCheck.success && phantomCheck.totalFound > 0) {
        console.log('🎭 Found phantom players, showing onboarding:', phantomCheck.totalFound);
        const onboardingResult = {
          success: true,
          user: userResult.user,
          claimablePhantomPlayers: phantomCheck.players,
          requiresOnboarding: true
        };
        console.log('📤 Returning onboarding result:', onboardingResult);
        return onboardingResult;
      } else {
        // No phantom players found, standard registration completed
        console.log('✅ Standard registration completed, no phantom players');
        return {
          success: true,
          user: userResult.user,
          requiresOnboarding: false
        };
      }
    } catch (error: any) {
      console.error('💥 Enhanced registration error:', error);
      logger.error('Enhanced registration error in context', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const checkPhantomPlayers = async (email: string) => {
    try {
      const result = await checkClaimablePlayersForEmail(email);
      return {
        success: result.success,
        players: result.players || [],
        error: result.error
      };
    } catch (error: any) {
      logger.error('Error checking phantom players', error);
      return {
        success: false,
        players: [],
        error: 'Failed to check phantom players'
      };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOutUser();
      setUser(null);
    } catch (error) {
      logger.error('Logout error', error);
      // Even if Firebase logout fails, clear local state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    return await resetPassword(email);
  };

  const handleResendEmailVerification = async () => {
    return await resendEmailVerification();
  };

  const isAdmin = () => user?.role === 'admin';
  const isPlayer = () => user?.role === 'player' || user?.role === 'admin';
  const isViewer = () => user?.role === 'viewer';
  const isAuthenticated = () => user !== null;
  
  const canCreateTournaments = () => getUserPermissions(user).canCreateTournaments;
  const canManagePlayers = () => getUserPermissions(user).canCreatePlayers;

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isInitialized,
        login, 
        register,
        registerWithPhantomCheck,
        checkPhantomPlayers,
        logout, 
        resetPassword: handlePasswordReset,
        resendEmailVerification: handleResendEmailVerification,
        isAdmin, 
        isPlayer,
        isViewer,
        isAuthenticated,
        canCreateTournaments,
        canManagePlayers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}