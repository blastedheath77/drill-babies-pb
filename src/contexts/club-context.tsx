'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getClubsForUser } from '@/lib/clubs';
import type { Club } from '@/lib/types';
import { logger } from '@/lib/logger';

interface ClubContextType {
  selectedClub: Club | null;
  availableClubs: Club[];
  isLoading: boolean;
  hasAnyClubs: boolean;
  selectClub: (clubId: string) => Promise<void>;
  refreshClubs: () => Promise<void>;
  hasClubAccess: (clubId: string) => boolean;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user's clubs when user changes
  useEffect(() => {
    if (user) {
      loadUserClubs();
    } else {
      setSelectedClub(null);
      setAvailableClubs([]);
      setIsLoading(false);
    }
  }, [user]);

  // Restore selected club from user preferences
  useEffect(() => {
    if (user && availableClubs.length > 0) {
      const savedClubId = user.selectedClubId;
      if (savedClubId && availableClubs.find(c => c.id === savedClubId)) {
        // User has a saved club preference and it's in their available clubs
        const savedClub = availableClubs.find(c => c.id === savedClubId);
        setSelectedClub(savedClub || null);
      } else {
        // Default to first available club
        setSelectedClub(availableClubs[0]);
        // Update user's preference
        if (availableClubs[0]) {
          updateUserSelectedClub(availableClubs[0].id).catch(err =>
            logger.error('Error updating default club selection:', err)
          );
        }
      }
    }
  }, [user, availableClubs]);

  const loadUserClubs = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const clubIds = user.clubMemberships || [];

      if (clubIds.length === 0) {
        logger.warn(`User ${user.id} has no club memberships`);
        setAvailableClubs([]);
        setSelectedClub(null);
        setIsLoading(false);
        return;
      }

      const clubs = await getClubsForUser(user.id, clubIds);
      setAvailableClubs(clubs);

      if (clubs.length === 0) {
        logger.warn(`User ${user.id} has club memberships but no active clubs found`);
      }
    } catch (error) {
      logger.error('Error loading user clubs:', error);
      setAvailableClubs([]);
      setSelectedClub(null);
    } finally {
      setIsLoading(false);
    }
  };

  const selectClub = async (clubId: string) => {
    if (!user) {
      logger.error('Cannot select club: user not authenticated');
      return;
    }

    const club = availableClubs.find(c => c.id === clubId);
    if (!club) {
      logger.error(`Cannot select club: club ${clubId} not found in available clubs`);
      return;
    }

    setSelectedClub(club);

    // Persist selection to user document
    await updateUserSelectedClub(clubId);
  };

  const updateUserSelectedClub = async (clubId: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        selectedClubId: clubId,
        updatedAt: serverTimestamp(),
      });
      logger.info(`Updated selected club to ${clubId} for user ${user.id}`);
    } catch (error) {
      logger.error('Error updating selected club:', error);
      throw error;
    }
  };

  const refreshClubs = async () => {
    await loadUserClubs();
  };

  const hasClubAccessFn = (clubId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Global admin has access to all clubs
    return user.clubMemberships?.includes(clubId) ?? false;
  };

  const hasAnyClubs = availableClubs.length > 0;

  return (
    <ClubContext.Provider
      value={{
        selectedClub,
        availableClubs,
        isLoading,
        hasAnyClubs,
        selectClub,
        refreshClubs,
        hasClubAccess: hasClubAccessFn,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}
