'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { getUserCircles, getCircle } from '@/lib/circles';
import { logger } from '@/lib/logger';
import { setupCircleDebugging } from '@/lib/circle-debug';
import type { Circle, CircleContext } from '@/lib/types';

interface CircleContextType {
  // Current context
  selectedCircleId: string | 'all';
  selectedCircle: Circle | null;
  availableCircles: Circle[];
  
  // Loading states
  isLoading: boolean;
  isLoadingCircles: boolean;
  
  // Actions
  setSelectedCircleId: (circleId: string | 'all') => void;
  selectCircle: (circleId: string | 'all') => void;
  refreshCircles: () => Promise<void>;
  refreshSelectedCircle: () => Promise<void>;
  
  // Utilities
  getCircleById: (circleId: string) => Circle | null;
  isUserInCircle: (circleId: string) => boolean;
}

const CircleContext = createContext<CircleContextType | undefined>(undefined);

const CIRCLE_STORAGE_KEY = 'selectedCircleId';
const DEFAULT_CIRCLE_ID = 'all';

export function CircleProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitialized } = useAuth();
  
  // Debug: Log whenever CircleProvider is called/re-rendered
  logger.info(`[CircleProvider] 🔥 COMPONENT RENDER/MOUNT - user:`, user?.id || 'null', `isAuthenticated:`, isAuthenticated(), `isInitialized:`, isInitialized);
  
  // Debug: Check if user changes over time
  React.useEffect(() => {
    const timer = setTimeout(() => {
      logger.info(`[CircleProvider] ⏰ 2-second check - user:`, user?.id || 'null', `isAuthenticated:`, isAuthenticated());
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, isAuthenticated]);
  
  // State
  const [selectedCircleId, setSelectedCircleIdState] = useState<string | 'all'>(DEFAULT_CIRCLE_ID);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [availableCircles, setAvailableCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCircles, setIsLoadingCircles] = useState(false);
  const [isCircleContextInitialized, setIsCircleContextInitialized] = useState(false);
  
  // Load circles when user is authenticated
  const loadUserCircles = async () => {
    logger.info(`[CircleContext] 🔥 loadUserCircles CALLED - START OF FUNCTION`);
    logger.info(`[CircleContext] 🔥 loadUserCircles - isAuthenticated: ${isAuthenticated()}, user:`, user);
    logger.info(`[CircleContext] 🔥 loadUserCircles - user?.id: ${user?.id}, user?.email: ${user?.email}`);
    
    if (!isAuthenticated() || !user) {
      logger.warn(`[CircleContext] ❌ EARLY RETURN - Not authenticated or no user - isAuthenticated: ${isAuthenticated()}, user exists: ${!!user}`);
      setAvailableCircles([]);
      return;
    }
    
    try {
      setIsLoadingCircles(true);
      logger.info(`[CircleContext] ✅ About to call getUserCircles for user ${user.id}, email: ${user.email}`);
      logger.info(`[CircleContext] ✅ Calling getUserCircles(${user.id}) NOW...`);
      
      const circles = await getUserCircles(user.id);
      logger.info(`[CircleContext] ✅ getUserCircles returned:`, circles);
      logger.info(`[CircleContext] ✅ About to call setAvailableCircles with:`, circles);
      setAvailableCircles(circles);
      logger.info(`[CircleContext] ✅ setAvailableCircles call completed`);
      
      logger.info(`[CircleContext] Loaded ${circles.length} circles for user ${user.id}:`, circles.map(c => ({id: c.id, name: c.name})));
      
      // Add a timeout to check if the state was actually updated
      setTimeout(() => {
        logger.info(`[CircleContext] 🔍 State check - availableCircles after 100ms:`, availableCircles);
      }, 100);
      
      // If user has circles but no valid selection, reset to first circle or 'all'
      if (circles.length > 0 && selectedCircleId !== 'all') {
        const hasValidSelection = circles.some(circle => circle.id === selectedCircleId);
        if (!hasValidSelection) {
          logger.info(`[CircleContext] Current selection ${selectedCircleId} is not valid, resetting to 'all'`);
          setSelectedCircleIdState('all');
          localStorage.removeItem(CIRCLE_STORAGE_KEY);
        }
      }
    } catch (error) {
      logger.error('[CircleContext] Failed to load user circles:', error);
      setAvailableCircles([]);
    } finally {
      setIsLoadingCircles(false);
    }
  };
  
  // Load selected circle details
  const loadSelectedCircle = async (circleId: string | 'all') => {
    if (circleId === 'all') {
      setSelectedCircle(null);
      return;
    }
    
    try {
      setIsLoading(true);
      const circle = await getCircle(circleId);
      setSelectedCircle(circle);
      
      if (!circle) {
        logger.warn(`Circle ${circleId} not found, resetting to 'all'`);
        setSelectedCircleIdState('all');
        localStorage.removeItem(CIRCLE_STORAGE_KEY);
      }
    } catch (error) {
      logger.error('Failed to load selected circle:', error);
      setSelectedCircle(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Set selected circle ID with persistence
  const setSelectedCircleId = (circleId: string | 'all') => {
    const previousCircleId = selectedCircleId;
    logger.info(`[CircleContext] setSelectedCircleId called - changing from ${previousCircleId} to: ${circleId}`);
    logger.info(`[CircleContext] Available circles when setting selection:`, availableCircles.map(c => ({id: c.id, name: c.name})));
    
    // Validate circle selection
    if (circleId !== 'all' && availableCircles.length > 0) {
      const isValidCircle = availableCircles.some(circle => circle.id === circleId);
      if (!isValidCircle) {
        logger.warn(`[CircleContext] Attempting to select invalid circle ${circleId}, available circles:`, availableCircles.map(c => c.id));
      }
    }
    
    setSelectedCircleIdState(circleId);
    
    if (circleId === 'all') {
      localStorage.removeItem(CIRCLE_STORAGE_KEY);
    } else {
      localStorage.setItem(CIRCLE_STORAGE_KEY, circleId);
    }
    
    loadSelectedCircle(circleId);
    
    // If circle selection changed, log it for debugging
    if (previousCircleId !== circleId) {
      logger.info(`[CircleContext] Circle selection changed from ${previousCircleId} to ${circleId} - player queries will refetch`);
    }
  };
  
  // Restore selected circle from localStorage
  const restoreSelectedCircle = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(CIRCLE_STORAGE_KEY);
      if (stored && stored !== 'all') {
        setSelectedCircleIdState(stored);
        loadSelectedCircle(stored);
      }
    } catch (error) {
      logger.error('Failed to restore selected circle:', error);
    }
  };
  
  // Refresh functions
  const refreshCircles = async () => {
    await loadUserCircles();
  };
  
  const refreshSelectedCircle = async () => {
    await loadSelectedCircle(selectedCircleId);
  };
  
  // Utility functions
  const getCircleById = (circleId: string): Circle | null => {
    return availableCircles.find(circle => circle.id === circleId) || null;
  };
  
  const isUserInCircle = (circleId: string): boolean => {
    return availableCircles.some(circle => circle.id === circleId);
  };
  
  // Initialize on mount
  useEffect(() => {
    logger.info(`[CircleContext] Initialization useEffect - isCircleContextInitialized: ${isCircleContextInitialized}`);
    if (!isCircleContextInitialized) {
      logger.info(`[CircleContext] Initializing circle context - restoring selected circle from localStorage`);
      restoreSelectedCircle();
      setIsCircleContextInitialized(true);
      // Setup debugging utilities for development
      setupCircleDebugging();
    }
  }, [isCircleContextInitialized]);
  
  // Load circles when user changes - but only after auth is initialized  
  useEffect(() => {
    logger.info(`[CircleContext] 🚨 USER CHANGE USEEFFECT TRIGGERED`);
    logger.info(`[CircleContext] 🚨 - isInitialized: ${isInitialized}`);
    logger.info(`[CircleContext] 🚨 - user object:`, user);
    logger.info(`[CircleContext] 🚨 - user?.id:`, user?.id);
    
    // Wait for AuthProvider to be initialized before doing anything
    if (!isInitialized) {
      logger.info(`[CircleContext] ⏳ Auth not initialized yet, skipping circle loading`);
      return;
    }
    
    // Check authentication directly from user state instead of using function
    const userIsAuthenticated = user !== null;
    logger.info(`[CircleContext] 🚨 - userIsAuthenticated (user !== null):`, userIsAuthenticated);
    logger.info(`[CircleContext] 🚨 Authentication check result: ${userIsAuthenticated}`);
    
    if (userIsAuthenticated && user?.id) {
      logger.info(`[CircleContext] ✅ User is authenticated, about to call loadUserCircles() for user ${user.id}`);
      logger.info(`[CircleContext] ✅ Calling loadUserCircles NOW`);
      loadUserCircles();
      logger.info(`[CircleContext] ✅ loadUserCircles() call completed`);
    } else {
      logger.warn(`[CircleContext] ❌ User not authenticated - userIsAuthenticated: ${userIsAuthenticated}, user: ${user?.id || 'null'}`);
      logger.info(`[CircleContext] Clearing circles and resetting selection`);
      setAvailableCircles([]);
      setSelectedCircle(null);
      setSelectedCircleIdState(DEFAULT_CIRCLE_ID);
      localStorage.removeItem(CIRCLE_STORAGE_KEY);
    }
  }, [user?.id, isInitialized]); // Depend on both user.id and isInitialized
  
  // Validate selected circle when available circles change
  useEffect(() => {
    logger.info(`[CircleContext] 🔍 Circle validation useEffect triggered - selectedCircleId: ${selectedCircleId}, availableCircles:`, availableCircles);
    logger.info(`[CircleContext] 🔍 availableCircles.length: ${availableCircles.length}`);
    
    if (selectedCircleId !== 'all' && availableCircles.length > 0) {
      const isValidSelection = availableCircles.some(circle => circle.id === selectedCircleId);
      logger.info(`[CircleContext] 🔍 Checking if ${selectedCircleId} is valid selection: ${isValidSelection}`);
      if (!isValidSelection) {
        logger.info(`[CircleContext] ❌ Selected circle ${selectedCircleId} is no longer available, resetting to 'all'`);
        setSelectedCircleId('all');
      } else {
        logger.info(`[CircleContext] ✅ Selected circle ${selectedCircleId} is valid`);
      }
    } else {
      logger.info(`[CircleContext] 🔍 Skipping validation - selectedCircleId: ${selectedCircleId}, circles count: ${availableCircles.length}`);
    }
  }, [availableCircles, selectedCircleId]);
  
  // Debug: Force log the current state values during render
  logger.info(`[CircleContext] 🔄 Context render - selectedCircleId: ${selectedCircleId}, availableCircles:`, availableCircles);

  const value: CircleContextType = {
    // Current context
    selectedCircleId,
    selectedCircle,
    availableCircles,
    
    // Loading states
    isLoading,
    isLoadingCircles,
    
    // Actions
    setSelectedCircleId,
    selectCircle: setSelectedCircleId, // Alias for compatibility
    refreshCircles,
    refreshSelectedCircle,
    
    // Utilities
    getCircleById,
    isUserInCircle,
  };
  
  return (
    <CircleContext.Provider value={value}>
      {children}
    </CircleContext.Provider>
  );
}

export function useCircles(): CircleContextType {
  const context = useContext(CircleContext);
  if (context === undefined) {
    throw new Error('useCircles must be used within a CircleProvider');
  }
  return context;
}

// Hook for getting circle-filtered context
export function useCircleContext(): CircleContext {
  const { selectedCircleId, availableCircles } = useCircles();
  
  return {
    selectedCircleId,
    availableCircles,
  };
}

// Hook for checking if we're in a specific circle context
export function useIsInCircleContext(circleId?: string): boolean {
  const { selectedCircleId } = useCircles();
  
  if (!circleId) {
    return selectedCircleId !== 'all';
  }
  
  return selectedCircleId === circleId;
}

// Hook for getting circle-specific data filtering
export function useCircleFilter() {
  const { selectedCircleId, selectedCircle } = useCircles();
  
  return {
    isFilteringByCircle: selectedCircleId !== 'all',
    circleId: selectedCircleId === 'all' ? null : selectedCircleId,
    circleName: selectedCircle?.name || 'All Players',
    filterLabel: selectedCircleId === 'all' ? 'All Players' : selectedCircle?.name || 'Unknown Circle'
  };
}