'use client';

/**
 * Theater Tech Sidebar Navigation
 *
 * Uses the UnifiedSidebar component for consistent design.
 * Provides navigation for theater technician operations.
 */

import { Activity, LayoutDashboard, User } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Dayboard',
    href: '/theater-tech/dayboard',
    icon: Activity,
  },
  {
    name: 'Legacy Board',
    href: '/theater-tech/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'My Profile',
    href: '/theater-tech/profile',
    icon: User,
  },
];

interface TheaterTechSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TheaterTechSidebar({ isOpen, onClose }: TheaterTechSidebarProps) {
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
        role: 'THEATER_TECHNICIAN',
      }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/theater-tech/dashboard"
    />
  );
}
