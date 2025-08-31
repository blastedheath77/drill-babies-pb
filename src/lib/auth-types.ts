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

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
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