'use client';

/**
 * Frontdesk Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 */

import { LayoutDashboard, Calendar, Users, UserPlus, User, Receipt } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/frontdesk/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Appointments',
    href: '/frontdesk/appointments',
    icon: Calendar,
  },
  {
    name: 'Patients',
    href: '/frontdesk/patients',
    icon: Users,
  },
  {
    name: 'Billing',
    href: '/frontdesk/billing',
    icon: Receipt,
  },
  {
    name: 'New Patient',
    href: '/frontdesk/patient-intake',
    icon: UserPlus,
  },
  {
    name: 'My Profile',
    href: '/frontdesk/profile',
    icon: User,
  },
];

interface FrontdeskSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function FrontdeskSidebar({ isOpen = false, onClose = () => { } }: FrontdeskSidebarProps) {
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
      role: 'FRONTDESK',
    }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/frontdesk/dashboard"
    />
  );
}
