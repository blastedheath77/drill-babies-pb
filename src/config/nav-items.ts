import type { LucideIcon } from 'lucide-react';
import { Home, Users, BarChart, Trophy, PlusSquare, UserCheck, Swords, Shield, Database, TestTube } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  category?: 'main' | 'action' | 'special' | 'admin';
  adminOnly?: boolean;
}

// Main navigation items
export const mainNavItems: NavItem[] = [
  { title: 'Home', href: '/', icon: Home, category: 'main' },
  { title: 'Players', href: '/players', icon: Users, category: 'main' },
  { title: 'Partnerships', href: '/partnerships', icon: UserCheck, category: 'main' },
  { title: 'Head-to-Head', href: '/head-to-head', icon: Swords, category: 'main' },
  { title: 'Rankings', href: '/statistics', icon: BarChart, category: 'main' },
  { title: 'Test', href: '/test', icon: TestTube, category: 'main' },
];

// Action items (with special styling)
export const actionNavItems: NavItem[] = [
  { title: 'Tournaments', href: '/tournaments', icon: Trophy, category: 'action' },
];

// Special action item at bottom
export const specialNavItems: NavItem[] = [
  { title: 'Log Game', href: '/log-game', icon: PlusSquare, category: 'special' },
];

// Admin-only items
export const adminNavItems: NavItem[] = [
  { title: 'Admin Dashboard', href: '/admin/dashboard', icon: Shield, category: 'admin', adminOnly: true },
  { title: 'Database Management', href: '/admin/database', icon: Database, category: 'admin', adminOnly: true },
];

// Legacy export for backwards compatibility
export const navItems: NavItem[] = [
  ...mainNavItems,
  ...actionNavItems,
  ...specialNavItems,
  ...adminNavItems,
];
