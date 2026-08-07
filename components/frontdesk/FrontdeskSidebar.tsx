'use client';

/**
 * Frontdesk Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 * Enhanced with proper section grouping for better organization.
 */

import { LayoutDashboard, Calendar, Users, UserPlus, User, Receipt, Building2, ClipboardList, Bell } from 'lucide-react';
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastAck = Number(localStorage.getItem(NEW_PATIENTS_ACK_KEY) || '0');
    if (newPatientsToday > lastAck) {
      localStorage.setItem(NEW_PATIENTS_ACK_KEY, String(newPatientsToday));
    }
  }, [newPatientsToday]);

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/frontdesk/dashboard',
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
      name: 'New Patient Intake',
      href: '/frontdesk/intake/start',
      icon: ClipboardList,
      section: 'Patient Care',
    },
    {
      name: 'Theater Scheduling',
      href: '/frontdesk/theater-scheduling',
      icon: Building2,
      section: 'Scheduling',
    },
    {
      name: 'Billing',
      href: '/frontdesk/billing',
      icon: Receipt,
      section: 'Billing & Finance',
    },
    {
      name: 'My Profile',
      href: '/frontdesk/profile',
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
      onCollapse={handleCollapse}
    />
  );
}