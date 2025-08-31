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