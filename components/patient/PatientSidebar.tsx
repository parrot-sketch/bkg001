'use client';

/**
 * Patient Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 */

import { LayoutDashboard, Calendar, FileText, User } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Home',
    href: '/patient/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'My Appointments',
    href: '/patient/appointments',
    icon: Calendar,
  },
  {
    name: 'Visit History',
    href: '/patient/consultations',
    icon: FileText,
  },
  {
    name: 'My Profile',
    href: '/patient/profile',
    icon: User,
  },
];

interface PatientSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PatientSidebar({ isOpen, onClose }: PatientSidebarProps) {
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
      role: 'PATIENT',
    }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/patient/dashboard"
    />
  );
}
