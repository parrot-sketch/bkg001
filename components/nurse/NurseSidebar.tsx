'use client';

/**
 * Nurse Sidebar Navigation
 *
 * Uses the UnifiedSidebar component for consistent design.
 */

import { LayoutDashboard, Users, FileText, User, ClipboardCheck, Bell } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/nurse/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Patients',
    href: '/nurse/patients',
    icon: Users,
  },
  {
    name: 'Pre-Op Cases',
    href: '/nurse/pre-op-cases',
    icon: ClipboardCheck,
  },
  {
    name: 'Recovery Care',
    href: '/nurse/pre-post-op',
    icon: FileText,
  },
  {
    name: 'Notifications',
    href: '/nurse/notifications',
    icon: Bell,
  },
  {
    name: 'My Profile',
    href: '/nurse/profile',
    icon: User,
  },
];

interface NurseSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NurseSidebar({ isOpen, onClose }: NurseSidebarProps) {
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
    />
  );
}
