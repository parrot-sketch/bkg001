'use client';

/**
 * Doctor Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 * Features structured sections for organized navigation.
 */

import { LayoutDashboard, Calendar, Users, User, Clock, Scissors, ClipboardCheck } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const baseNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/doctor/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },
  {
    name: 'Appointments',
    href: '/doctor/appointments',
    icon: Calendar,
    section: 'Patient Care',
  },
  {
    name: 'Consultations Hub',
    href: '/doctor/consultations',
    icon: ClipboardCheck,
    section: 'Patient Care',
  },
  {
    name: 'My Patients',
    href: '/doctor/patients',
    icon: Users,
    section: 'Patient Care',
  },
  {
    name: 'Surgical Cases',
    href: '/doctor/surgical-cases',
    icon: Scissors,
    section: 'Surgical Planning',
  },
  {
    name: 'Availability',
    href: '/doctor/schedule',
    icon: Clock,
    section: 'Schedule',
  },
  {
    name: 'My Profile',
    href: '/doctor/profile',
    icon: User,
    section: 'Account',
  },
];

interface DoctorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

export function DoctorSidebar({ isOpen, onClose, onCollapse }: DoctorSidebarProps) {
  const { logout, user } = useAuth();

  const navItems = baseNavItems;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userInfo: UserInfo | null = user
    ? {
      name: `Dr. ${user.firstName || user.email}`,
      email: user.email,
      role: 'DOCTOR',
    }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/doctor/dashboard"
      onCollapse={onCollapse}
    />
  );
}