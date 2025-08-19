import type { LucideIcon } from 'lucide-react';
import { Home, Users, BarChart, Trophy, PlusSquare, UserCheck, Swords, Shield, Database, TestTube, Calendar } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  category?: 'main' | 'action' | 'special' | 'admin';
  priority: 'primary' | 'secondary' | 'tertiary';
  adminOnly?: boolean;
  mobileVisible?: boolean;
  desktopVisible?: boolean;
  bottomNavEligible?: boolean;
  description?: string;
}

// Main navigation items
export const mainNavItems: NavItem[] = [
  { 
    title: 'Home', 
    href: '/', 
    icon: Home, 
    category: 'main',
    priority: 'primary',
    bottomNavEligible: true,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Dashboard overview'
  },
  { 
    title: 'Players', 
    href: '/players', 
    icon: Users, 
    category: 'main',
    priority: 'secondary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Browse club players'
  },
  { 
    title: 'Games', 
    href: '/games', 
    icon: Calendar, 
    category: 'main',
    priority: 'secondary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'View game history'
  },
  { 
    title: 'Partnerships', 
    href: '/partnerships', 
    icon: UserCheck, 
    category: 'main',
    priority: 'tertiary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Doubles partnership stats'
  },
  { 
    title: 'Head-to-Head', 
    href: '/head-to-head', 
    icon: Swords, 
    category: 'main',
    priority: 'tertiary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Player matchup stats'
  },
  { 
    title: 'Rankings', 
    href: '/statistics', 
    icon: BarChart, 
    category: 'main',
    priority: 'primary',
    bottomNavEligible: true,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Player leaderboards'
  },
  { 
    title: 'Test', 
    href: '/test', 
    icon: TestTube, 
    category: 'main',
    priority: 'tertiary',
    bottomNavEligible: false,
    mobileVisible: false,
    desktopVisible: true,
    description: 'Testing page'
  },
];

// Action items (with special styling)
export const actionNavItems: NavItem[] = [
  { 
    title: 'Tournaments', 
    href: '/tournaments', 
    icon: Trophy, 
    category: 'action',
    priority: 'secondary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Manage tournaments'
  },
];

// Special action item at bottom
export const specialNavItems: NavItem[] = [
  { 
    title: 'Log Game', 
    href: '/log-game', 
    icon: PlusSquare, 
    category: 'special',
    priority: 'primary',
    bottomNavEligible: true,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Record new game'
  },
];

// Admin-only items
export const adminNavItems: NavItem[] = [
  { 
    title: 'Admin Dashboard', 
    href: '/admin/dashboard', 
    icon: Shield, 
    category: 'admin',
    priority: 'tertiary',
    adminOnly: true,
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Admin controls'
  },
  { 
    title: 'Database Management', 
    href: '/admin/database', 
    icon: Database, 
    category: 'admin',
    priority: 'tertiary',
    adminOnly: true,
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Database management'
  },
];

// All navigation items combined
export const allNavItems: NavItem[] = [
  ...mainNavItems,
  ...actionNavItems,
  ...specialNavItems,
  ...adminNavItems,
];

// Legacy export for backwards compatibility
export const navItems: NavItem[] = allNavItems;

// Utility functions for filtering navigation items
export function getVisibleNavItems(isAdmin: boolean = false, isMobile: boolean = false): NavItem[] {
  return allNavItems.filter(item => {
    // Filter by admin status
    if (item.adminOnly && !isAdmin) return false;
    
    // Filter by device visibility
    if (isMobile && item.mobileVisible === false) return false;
    if (!isMobile && item.desktopVisible === false) return false;
    
    return true;
  });
}

export function getBottomNavItems(isAdmin: boolean = false): NavItem[] {
  return allNavItems
    .filter(item => {
      // Must be eligible for bottom nav
      if (!item.bottomNavEligible) return false;
      
      // Filter by admin status
      if (item.adminOnly && !isAdmin) return false;
      
      // Must be mobile visible
      if (item.mobileVisible === false) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Sort by priority (primary first)
      const priorityOrder = { primary: 0, secondary: 1, tertiary: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 4); // Limit to 4 items for bottom nav
}

export function getNavItemsByCategory(category: NavItem['category'], isAdmin: boolean = false): NavItem[] {
  return allNavItems.filter(item => {
    if (item.category !== category) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });
}

export function getNavItemsByPriority(priority: NavItem['priority'], isAdmin: boolean = false): NavItem[] {
  return allNavItems.filter(item => {
    if (item.priority !== priority) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });
}
