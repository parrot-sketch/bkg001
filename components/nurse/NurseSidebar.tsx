'use client';

/**
 * Nurse Sidebar Navigation
 *
 * Mirrors frontdesk grouping so clinical staff can reach the same
 * patient-facing pages (patients, appointments, theater) while keeping
 * nurse-specific workflows accessible.
 */

import { LayoutDashboard, Calendar, Users, ClipboardList, User, Bell, Activity, HeartPulse } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/nurse/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },
  {
    name: 'Appointments',
    href: '/frontdesk/appointments',
    icon: Calendar,
    section: 'Patient Care',
  },
  {
    name: 'Patients',
    href: '/frontdesk/patients',
    icon: Users,
    section: 'Patient Care',
  },
  {
    name: 'Theater Schedule',
    href: '/frontdesk/theater-scheduling',
    icon: Activity,
    section: 'Patient Care',
  },
  {
    name: 'Ward Prep',
    href: '/nurse/ward-prep',
    icon: HeartPulse,
    section: 'Clinical',
  },
  {
    name: 'Theatre Support',
    href: '/nurse/theatre-support',
    icon: Activity,
    section: 'Clinical',
  },
  {
    name: 'Recovery & Discharge',
    href: '/nurse/recovery-discharge',
    icon: HeartPulse,
    section: 'Clinical',
  },
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
