'use client';

/**
 * Admin Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 */

import { useEffect, useState } from 'react';
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
  ShieldCheck,
  Package,
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
    name: 'Inventory',
    href: '/admin/inventory',
    icon: Package,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userInfo: UserInfo | null = mounted && user
    ? {
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email,
      email: user.email,
      role: user.role as any, // Cast to any to satisfy the complex role enum mapping in UnifiedSidebar
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
