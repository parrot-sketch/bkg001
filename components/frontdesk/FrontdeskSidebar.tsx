'use client';

/**
 * Frontdesk Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 * Enhanced with proper section grouping for better organization.
 * Supports FRONTDESK, NURSE, and ADMIN roles with role-adaptive navigation.
 */

import { LayoutDashboard, Calendar, Users, UserPlus, User, Receipt, Building2, ClipboardList, Scissors } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

interface FrontdeskSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

export function FrontdeskSidebar({ isOpen = false, onClose = () => { }, onCollapse }: FrontdeskSidebarProps) {
  const { logout, user } = useAuth();
  const role = user?.role || 'FRONTDESK';

  const isNurse = role === 'NURSE';
  const isAdmin = role === 'ADMIN';

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: isNurse ? '/nurse/dashboard' : isAdmin ? '/admin/dashboard' : '/frontdesk/dashboard',
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
      href: isNurse ? '/nurse/patients' : '/frontdesk/patients',
      icon: Users,
      section: 'Patient Care',
    },
    {
      name: 'Surgical Schedule',
      href: isNurse ? '/nurse/surgical-cases' : '/frontdesk/surgical-cases',
      icon: Scissors,
      section: 'Patient Care',
    },
    {
      name: 'Theater Schedule',
      href: '/frontdesk/theater-scheduling',
      icon: Building2,
      section: 'Patient Care',
    },
    {
      name: 'Billing',
      href: '/frontdesk/billing',
      icon: Receipt,
      section: 'Billing & Finance',
    },
    ...(isNurse
      ? [
          {
            name: 'Ward Prep',
            href: '/nurse/ward-prep',
            icon: ClipboardList,
            section: 'Clinical',
          } as NavItem,
          {
            name: 'Intra-Op',
            href: '/nurse/intra-op',
            icon: Building2,
            section: 'Clinical',
          } as NavItem,
          {
            name: 'Post-Op',
            href: '/nurse/post-op',
            icon: UserPlus,
            section: 'Clinical',
          } as NavItem,
        ]
      : []),
    {
      name: 'My Profile',
      href: isNurse ? '/nurse/profile' : isAdmin ? '/admin/profile' : '/frontdesk/profile',
      icon: User,
      section: 'Account',
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCollapse = (collapsed: boolean) => {
    onCollapse?.(collapsed);
  };

  const userInfo: UserInfo | null = user
    ? {
        name: user.firstName || user.email,
        email: user.email,
        role: role as any,
      }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref={isNurse ? '/nurse/dashboard' : isAdmin ? '/admin/dashboard' : '/frontdesk/dashboard'}
      onCollapse={handleCollapse}
    />
  );
}
