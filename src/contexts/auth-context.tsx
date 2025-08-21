'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContextType, User } from '@/lib/auth-types';
import { 
  signInUser, 
  signOutUser, 
  registerUser, 
  onAuthStateChange 
} from '@/lib/user-management';
import { getUserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Try Firebase Auth first, fallback to localStorage
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        logger.info('User signed in via Firebase', { uid: firebaseUser.id, email: firebaseUser.email });
      } else {
        // Check localStorage for mock user data
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('pbstats-user');
          const hasLoggedOut = localStorage.getItem('pbstats-logged-out');
          
          if (storedUser && !hasLoggedOut) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
              logger.info('User loaded from localStorage', { id: userData.id, email: userData.email });
            } catch (error) {
              localStorage.removeItem('pbstats-user');
              logger.error('Failed to parse stored user data', error);
            }
          }
        }
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
        // Firebase Auth is now properly configured
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
        // Firebase Auth is now properly configured
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
      // Try Firebase logout first
      const success = await signOutUser();
      
      // Always clear localStorage and set user to null (works for both Firebase and mock)
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pbstats-user');
        localStorage.setItem('pbstats-logged-out', 'true');
      }
    } catch (error) {
      logger.error('Logout error', error);
      // Even if Firebase logout fails, clear local state
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pbstats-user');
        localStorage.setItem('pbstats-logged-out', 'true');
      }
    } finally {
      setIsLoading(false);
    }
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