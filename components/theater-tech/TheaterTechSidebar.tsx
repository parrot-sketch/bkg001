'use client';

import {
  Activity, Building2, LayoutDashboard, Scissors, User, Users, Package, Stethoscope
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
 * CATALOG
 *   Services      → /theater-tech/services
 *   Procedures    → /theater-tech/procedures
 *
 * INVENTORY
 *   Inventory Hub → /theater-tech/inventory (Items, Batches, Vendors, POs, Receipts)
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

  // ── Catalog ───────────────────────────────────────────────────────────────
  {
    name: 'Services',
    href: '/theater-tech/services',
    icon: Stethoscope,
    section: 'Catalog',
  },
  {
    name: 'Procedures',
    href: '/theater-tech/procedures',
    icon: Scissors,
    section: 'Catalog',
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    name: 'Inventory Hub',
    href: '/theater-tech/inventory',
    icon: Package,
    section: 'Inventory',
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
