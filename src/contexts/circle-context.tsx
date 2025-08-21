'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { getUserCircles, getCircle } from '@/lib/circles';
import { logger } from '@/lib/logger';
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
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [selectedCircleId, setSelectedCircleIdState] = useState<string | 'all'>(DEFAULT_CIRCLE_ID);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [availableCircles, setAvailableCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCircles, setIsLoadingCircles] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Load circles when user is authenticated
  const loadUserCircles = async () => {
    if (!isAuthenticated() || !user) {
      setAvailableCircles([]);
      return;
    }
    
    try {
      setIsLoadingCircles(true);
      logger.info(`Loading circles for user ${user.id}`);
      
      const circles = await getUserCircles(user.id);
      setAvailableCircles(circles);
      
      logger.info(`Loaded ${circles.length} circles for user`);
    } catch (error) {
      logger.error('Failed to load user circles:', error);
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
    logger.info(`Setting selected circle to: ${circleId}`);
    setSelectedCircleIdState(circleId);
    
    if (circleId === 'all') {
      localStorage.removeItem(CIRCLE_STORAGE_KEY);
    } else {
      localStorage.setItem(CIRCLE_STORAGE_KEY, circleId);
    }
    
    loadSelectedCircle(circleId);
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
    if (!isInitialized) {
      restoreSelectedCircle();
      setIsInitialized(true);
    }
  }, [isInitialized]);
  
  // Load circles when user changes
  useEffect(() => {
    if (isAuthenticated()) {
      loadUserCircles();
    } else {
      setAvailableCircles([]);
      setSelectedCircle(null);
      setSelectedCircleIdState(DEFAULT_CIRCLE_ID);
      localStorage.removeItem(CIRCLE_STORAGE_KEY);
    }
  }, [user, isAuthenticated]);
  
  // Validate selected circle when available circles change
  useEffect(() => {
    if (selectedCircleId !== 'all' && availableCircles.length > 0) {
      const isValidSelection = availableCircles.some(circle => circle.id === selectedCircleId);
      if (!isValidSelection) {
        logger.info(`Selected circle ${selectedCircleId} is no longer available, resetting to 'all'`);
        setSelectedCircleId('all');
      }
    }
  }, [availableCircles, selectedCircleId]);
  
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