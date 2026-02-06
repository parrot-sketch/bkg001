'use client';

/**
 * Admin Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 */

import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FileText,
  BarChart3,
  User,
  Building2,
  Syringe,
} from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Patients',
    href: '/admin/patients',
    icon: Users,
  },
  {
    name: 'Staff',
    href: '/admin/staff',
    icon: UserCheck,
  },
  {
    name: 'Appointments',
    href: '/admin/appointments',
    icon: Calendar,
  },
  {
    name: 'Recovery Care',
    href: '/admin/pre-post-op',
    icon: FileText,
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    name: 'Clinic Settings',
    href: '/admin/clinic',
    icon: Building2,
  },
  {
    name: 'Theaters',
    href: '/admin/theaters',
    icon: Syringe,
  },
  {
    name: 'Profile',
    href: '/admin/profile',
    icon: User,
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
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
      role: 'ADMIN',
    }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/admin/dashboard"
    />
  );
}
