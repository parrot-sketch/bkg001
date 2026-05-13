'use client';

/**
 * Admin Sidebar Navigation
 *
 * Uses the UnifiedSidebar component for consistent design.
 * Structured sections: Overview | Patient Care | Staff | Operations | Analytics | Account
 */

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FileText,
  BarChart3,
  User,
  Building2,
  Syringe,
  CreditCard,
  Stethoscope,
  Scissors,
} from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  // ── Overview ────────────────────────────────────────────────────────────────
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },

  // ── Patient Care ─────────────────────────────────────────────────────────────
  {
    name: 'Patients',
    href: '/admin/patients',
    icon: Users,
    section: 'Patient Care',
  },
  {
    name: 'Appointments',
    href: '/admin/appointments',
    icon: Calendar,
    section: 'Patient Care',
  },
  {
    name: 'Recovery Care',
    href: '/admin/pre-post-op',
    icon: FileText,
    section: 'Patient Care',
  },

  // ── Staff Administration ─────────────────────────────────────────────────────
  {
    name: 'Staff',
    href: '/admin/staff',
    icon: UserCheck,
    section: 'Staff',
  },

  // ── Operations ────────────────────────────────────────────────────────────────
  {
    name: 'Inventory',
    href: '/admin/inventory',
    icon: Building2,
    section: 'Operations',
  },
  {
    name: 'Theaters',
    href: '/admin/theaters',
    icon: Syringe,
    section: 'Operations',
  },
  {
    name: 'Services',
    href: '/admin/services',
    icon: Stethoscope,
    section: 'Operations',
  },
  {
    name: 'Procedures',
    href: '/admin/procedures',
    icon: Scissors,
    section: 'Operations',
  },

  // ── Analytics & Finance ──────────────────────────────────────────────────────
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
    section: 'Analytics',
  },
  {
    name: 'Billing',
    href: '/admin/billing',
    icon: CreditCard,
    section: 'Analytics',
  },

  // ── Account ──────────────────────────────────────────────────────────────────
  {
    name: 'My Profile',
    href: '/admin/profile',
    icon: User,
    section: 'Account',
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

export function AdminSidebar({ isOpen, onClose, onCollapse }: AdminSidebarProps) {
  const { logout, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userInfo: UserInfo | null = mounted && user
    ? {
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        email: user.email,
        role: 'ADMIN',
      }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/admin/dashboard"
      onCollapse={onCollapse}
    />
  );
}
