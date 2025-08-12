'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContextType, User, UserRole } from '@/lib/auth-types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo (in production, this would be in your database)
const MOCK_USERS = [
  {
    id: 'admin-1',
    name: 'Club Admin',
    email: 'admin@pbstats.com',
    role: 'admin' as UserRole,
    avatar: 'https://placehold.co/100x100/4287f5/white.png?text=A',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'player-1',
    name: 'John Player',
    email: 'player@pbstats.com',
    role: 'player' as UserRole,
    avatar: 'https://placehold.co/100x100/10b981/white.png?text=P',
    createdAt: new Date().toISOString(),
  },
];

// Mock credentials (in production, use proper authentication)
const MOCK_CREDENTIALS = [
  { email: 'admin@pbstats.com', password: 'admin123' },
  { email: 'player@pbstats.com', password: 'player123' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem('pbstats-user');
    const hasLoggedOut = localStorage.getItem('pbstats-logged-out');
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('pbstats-user');
      }
    } else if (!hasLoggedOut) {
      // Only default to admin if user hasn't explicitly logged out
      const defaultAdmin = MOCK_USERS[0]; // Admin user
      setUser(defaultAdmin);
      localStorage.setItem('pbstats-user', JSON.stringify(defaultAdmin));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const credentials = MOCK_CREDENTIALS.find(
      c => c.email === email && c.password === password
    );
    
    if (credentials) {
      const userData = MOCK_USERS.find(u => u.email === email);
      if (userData) {
        setUser(userData);
        localStorage.setItem('pbstats-user', JSON.stringify(userData));
        localStorage.removeItem('pbstats-logged-out'); // Clear logout flag
        setIsLoading(false);
        return { success: true };
      }
    }
    
    setIsLoading(false);
    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pbstats-user');
    localStorage.setItem('pbstats-logged-out', 'true'); // Set logout flag
  };

  const isAdmin = () => user?.role === 'admin';
  const isPlayer = () => user?.role === 'player' || user?.role === 'admin';

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        login, 
        logout, 
        isAdmin, 
        isPlayer 
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