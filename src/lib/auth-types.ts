import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'viewer' | 'player' | 'admin';

export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserDocument {
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  registerWithPhantomCheck: (email: string, password: string, name: string) => Promise<EnhancedRegistrationResult>;
  checkPhantomPlayers: (email: string) => Promise<{ success: boolean; players: ClaimablePlayer[]; error?: string }>;
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
}

export interface LoginCredentials {
  email: string;
  password: string;
}