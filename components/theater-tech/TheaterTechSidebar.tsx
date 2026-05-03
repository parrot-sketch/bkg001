'use client';

import {
  Activity, Building2, LayoutDashboard, Scissors, User, Users,
} from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

/**
 * Theater Tech Sidebar
 *
 * Navigation structure (post-consolidation):
 *
 * OVERVIEW
 *   Dashboard
 *
 * OPERATIONS
 *   Theater       → /theater-tech/theater  (Schedule + Booking Queue + Suites)
 *   Dayboard      → /theater-tech/dayboard
 *   Surgical Cases → /theater-tech/surgical-cases
 *
 * PATIENTS
 *   Patients      → /theater-tech/patients (Search + Upcoming Procedures + Consultations)
 *
 * INVENTORY
 *   Item Catalog, Batches & Stock, Vendors, Purchase Orders, Goods Receipts
 *   (kept for backward-compat, can be collapsed further in a future iteration)
 *
 * ACCOUNT
 *   My Profile
 */

const navItems: NavItem[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  {
    name: 'Dashboard',
    href: '/theater-tech/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },

  // ── Operations ────────────────────────────────────────────────────────────
  {
    name: 'Theater',
    href: '/theater-tech/theater',
    icon: Building2,
    section: 'Operations',
  },
  {
    name: 'Dayboard',
    href: '/theater-tech/dayboard',
    icon: Activity,
    section: 'Operations',
  },
  {
    name: 'Surgical Cases',
    href: '/theater-tech/surgical-cases',
    icon: Scissors,
    section: 'Operations',
  },

  // ── Patients ──────────────────────────────────────────────────────────────
  {
    name: 'Patients',
    href: '/theater-tech/patients',
    icon: Users,
    section: 'Patients',
  },

  // ── Account ───────────────────────────────────────────────────────────────
  {
    name: 'My Profile',
    href: '/theater-tech/profile',
    icon: User,
    section: 'Account',
  },
];

interface TheaterTechSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

export function TheaterTechSidebar({ isOpen, onClose, onCollapse }: TheaterTechSidebarProps) {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error('Logout failed:', e); }
  };

  const userInfo: UserInfo | null = user
    ? { name: user.firstName || user.email, email: user.email, role: 'THEATER_TECHNICIAN' }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/theater-tech/dashboard"
      onCollapse={onCollapse}
    />
  );
}
