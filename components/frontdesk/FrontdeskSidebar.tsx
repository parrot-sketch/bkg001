'use client';

/**
 * Frontdesk Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 * Enhanced with proper section grouping for better organization.
 * Supports FRONTDESK, NURSE, and ADMIN roles with role-adaptive navigation.
 */

import { LayoutDashboard, Calendar, Users, UserPlus, User, Receipt, Building2, ClipboardList, Bell, Scissors } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDashboardStats } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { useEffect } from 'react';

interface FrontdeskSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

const NEW_PATIENTS_ACK_KEY = 'frontdesk_new_patients_ack_count';

export function FrontdeskSidebar({ isOpen = false, onClose = () => { }, onCollapse }: FrontdeskSidebarProps) {
  const { logout, user } = useAuth();
  const { data: stats } = useDashboardStats();
  const newPatientsToday = stats?.newPatientsToday ?? 0;
  const role = user?.role || 'FRONTDESK';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastAck = Number(localStorage.getItem(NEW_PATIENTS_ACK_KEY) || '0');
    if (newPatientsToday > lastAck) {
      localStorage.setItem(NEW_PATIENTS_ACK_KEY, String(newPatientsToday));
    }
  }, [newPatientsToday]);

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
      href: '/frontdesk/patients',
      icon: Users,
      section: 'Patient Care',
      badge: newPatientsToday > 0 ? newPatientsToday : undefined,
    },
    {
      name: 'Surgical Schedule',
      href: '/frontdesk/surgical-cases',
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
            name: 'Theatre Support',
            href: '/nurse/theatre-support',
            icon: Building2,
            section: 'Clinical',
          } as NavItem,
          {
            name: 'Recovery & Discharge',
            href: '/nurse/recovery-discharge',
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
