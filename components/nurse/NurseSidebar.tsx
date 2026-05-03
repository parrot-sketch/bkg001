'use client';

/**
 * Nurse Sidebar Navigation
 *
 * Uses the UnifiedSidebar component for consistent design.
 */

import { LayoutDashboard, Users, FileText, User, ClipboardCheck, Bell, Activity, HeartPulse } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  {
    name: 'Dashboard',
    href: '/nurse/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },
  
  // ── Clinical Care ─────────────────────────────────────────────────────────
  {
    name: 'Ward Prep',
    href: '/nurse/ward-prep',
    icon: ClipboardCheck,
    section: 'Clinical Care',
  },
  {
    name: 'Theatre Support',
    href: '/nurse/theatre-support',
    icon: Activity,
    section: 'Clinical Care',
  },
  {
    name: 'Recovery & Discharge',
    href: '/nurse/recovery-discharge',
    icon: HeartPulse,
    section: 'Clinical Care',
  },

  // ── Patients ──────────────────────────────────────────────────────────────
  {
    name: 'Patients',
    href: '/nurse/patients',
    icon: Users,
    section: 'Patients',
  },

  // ── Account ───────────────────────────────────────────────────────────────
  {
    name: 'Notifications',
    href: '/nurse/notifications',
    icon: Bell,
    section: 'Account',
  },
  {
    name: 'My Profile',
    href: '/nurse/profile',
    icon: User,
    section: 'Account',
  },
];

interface NurseSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

export function NurseSidebar({ isOpen, onClose, onCollapse }: NurseSidebarProps) {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userInfo: UserInfo | null = user
    ? {
      name: user.firstName || user.email,
      email: user.email,
      role: 'NURSE',
    }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/nurse/dashboard"
      onCollapse={onCollapse}
    />
  );
}
