import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'viewer' | 'player' | 'admin';

export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt?: string;
  // New profile fields for user-centric transformation
  location?: {
    city: string;
    country: string;
  };
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string; // ISO date string
  duprId?: string;
  connectedPlayerId?: string; // Link to Player record when user registers
}

export interface UserDocument {
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // New profile fields for user-centric transformation
  location?: {
    city: string;
    country: string;
  };
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string; // ISO date string
  duprId?: string;
  connectedPlayerId?: string; // Link to Player record when user registers
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface ClaimablePlayer {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  rating: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  isPhantom?: boolean;
  canClaim: boolean;
  claimError?: string;
  gamesPlayed: number;
  currentRating: number;
}

export interface EnhancedRegistrationResult {
  success: boolean;
  user?: User;
  claimablePhantomPlayers?: ClaimablePlayer[];
  requiresOnboarding?: boolean;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  registerWithPhantomCheck: (email: string, password: string, name: string, profileData?: any) => Promise<EnhancedRegistrationResult>;
  checkPhantomPlayers: (email: string) => Promise<{ success: boolean; players: ClaimablePlayer[]; error?: string }>;
  updateUserProfile: (updates: {
    name?: string;
    bio?: string;
    location?: { city: string; country: string };
    gender?: 'Male' | 'Female' | 'Other';
    dateOfBirth?: string;
    duprId?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendEmailVerification: () => Promise<{ success: boolean; error?: string }>;
  isAdmin: () => boolean;
  isPlayer: () => boolean;
  isViewer: () => boolean;
  isAuthenticated: () => boolean;
  canCreateTournaments: () => boolean;
  canManagePlayers: () => boolean;
}

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  // New profile fields
  location?: {
    city: string;
    country: string;
  };
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string; // ISO date string
  duprId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}