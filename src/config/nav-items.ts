import type { LucideIcon } from 'lucide-react';
import { Home, Users, BarChart, Trophy, PlusSquare, UserCheck, Swords, Shield, Database, TestTube, CalendarDays, Users2, Grid3x3, Building2 } from 'lucide-react';
import { PaddleIcon } from '@/components/icons/paddle-icon';
import type { UserRole } from '@/lib/auth-types';

type NavIcon = LucideIcon | React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;

export interface NavItem {
  title: string;
  href: string;
  icon: NavIcon;
  label?: string;
  category?: 'main' | 'action' | 'special' | 'admin';
  priority: 'primary' | 'secondary' | 'tertiary';
  adminOnly?: boolean;
  minRole?: UserRole; // Minimum role required to see this item
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
    icon: PaddleIcon,
    category: 'main',
    priority: 'secondary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'View game history'
  },
  {
    title: 'Stats',
    href: '/statistics',
    icon: BarChart,
    category: 'main',
    priority: 'primary',
    bottomNavEligible: true,
    mobileVisible: true,
    desktopVisible: true,
    description: 'View statistics and analytics'
  },
  {
    title: 'Circles',
    href: '/circles',
    icon: Users2,
    category: 'main',
    priority: 'tertiary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Player groups for filtering'
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
    title: 'Events',
    href: '/events',
    icon: CalendarDays,
    category: 'action',
    priority: 'secondary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Schedule and manage events'
  },
  {
    title: 'Sessions',
    href: '/tournaments',
    icon: Trophy,
    category: 'action',
    priority: 'secondary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Manage tournaments and sessions'
  },
  {
    title: 'Box Leagues',
    href: '/box-leagues',
    icon: Grid3x3,
    category: 'action',
    priority: 'secondary',
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Competitive box league system'
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
    minRole: 'player', // Viewers cannot log games
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
    title: 'Clubs',
    href: '/clubs',
    icon: Building2,
    category: 'admin',
    priority: 'tertiary',
    adminOnly: true,
    bottomNavEligible: false,
    mobileVisible: true,
    desktopVisible: true,
    description: 'Manage clubs'
  },
];

// Account items (visible to all users)
// Settings removed - accessible via user name link only
export const accountNavItems: NavItem[] = [];

// All navigation items combined
export const allNavItems: NavItem[] = [
  ...mainNavItems,
  ...actionNavItems,
  ...specialNavItems,
  ...adminNavItems,
  ...accountNavItems,
];

// Legacy export for backwards compatibility
export const navItems: NavItem[] = allNavItems;

// Role hierarchy for filtering
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'viewer': 0,
  'player': 1,
  'admin': 2,
};

// Utility functions for filtering navigation items
export function getVisibleNavItems(userRole: UserRole | null = 'viewer', isMobile: boolean = false): NavItem[] {
  const roleLevel = userRole ? ROLE_HIERARCHY[userRole] : 0;
  
  return allNavItems.filter(item => {
    // Filter by role requirements
    if (item.minRole && roleLevel < ROLE_HIERARCHY[item.minRole]) return false;
    if (item.adminOnly && userRole !== 'admin') return false;
    
    // Filter by device visibility
    if (isMobile && item.mobileVisible === false) return false;
    if (!isMobile && item.desktopVisible === false) return false;
    
    return true;
  });
}

export function getBottomNavItems(userRole: UserRole | null = 'viewer'): NavItem[] {
  const roleLevel = userRole ? ROLE_HIERARCHY[userRole] : 0;
  
  return allNavItems
    .filter(item => {
      // Must be eligible for bottom nav
      if (!item.bottomNavEligible) return false;
      
      // Filter by role requirements
      if (item.minRole && roleLevel < ROLE_HIERARCHY[item.minRole]) return false;
      if (item.adminOnly && userRole !== 'admin') return false;
      
      // Must be mobile visible
      if (item.mobileVisible === false) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Custom order: Home, Rankings, Log Game
      const customOrder = { '/': 0, '/statistics': 1, '/log-game': 2 };
      const aOrder = customOrder[a.href as keyof typeof customOrder] ?? 99;
      const bOrder = customOrder[b.href as keyof typeof customOrder] ?? 99;
      return aOrder - bOrder;
    })
    .slice(0, 4); // Limit to 4 items for bottom nav
}

export function getNavItemsByCategory(category: NavItem['category'], userRole: UserRole | null = 'viewer'): NavItem[] {
  const roleLevel = userRole ? ROLE_HIERARCHY[userRole] : 0;
  
  return allNavItems.filter(item => {
    if (item.category !== category) return false;
    if (item.minRole && roleLevel < ROLE_HIERARCHY[item.minRole]) return false;
    if (item.adminOnly && userRole !== 'admin') return false;
    return true;
  });
}

export function getNavItemsByPriority(priority: NavItem['priority'], userRole: UserRole | null = 'viewer'): NavItem[] {
  const roleLevel = userRole ? ROLE_HIERARCHY[userRole] : 0;
  
  return allNavItems.filter(item => {
    if (item.priority !== priority) return false;
    if (item.minRole && roleLevel < ROLE_HIERARCHY[item.minRole]) return false;
    if (item.adminOnly && userRole !== 'admin') return false;
    return true;
  });
}
