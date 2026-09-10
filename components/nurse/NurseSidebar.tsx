'use client';

/**
 * Nurse Sidebar — journey-aligned navigation
 *
 * Cases → Ward Prep → Intra-Op → Post-Op
 * (plus dashboard + account). No frontdesk cross-links.
 */

import {
  LayoutDashboard,
  ClipboardList,
  User,
  Bell,
  Activity,
  HeartPulse,
  FolderKanban,
} from 'lucide-react';
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
    name: 'Cases',
    href: '/nurse/surgical-cases',
    icon: FolderKanban,
    section: 'Journey',
  },
  {
    name: 'Ward Prep',
    href: '/nurse/ward-prep',
    icon: ClipboardList,
    section: 'Journey',
  },
  {
    name: 'Intra-Op',
    href: '/nurse/intra-op',
    icon: Activity,
    section: 'Journey',
  },
  {
    name: 'Post-Op',
    href: '/nurse/post-op',
    icon: HeartPulse,
    section: 'Journey',
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
