'use client';

/**
 * Doctor Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 */

import { LayoutDashboard, Calendar, FileText, Users, User, Clock, Scissors } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/doctor/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Appointments',
    href: '/doctor/appointments',
    icon: Calendar,
  },
  {
    name: 'Availability',
    href: '/doctor/schedule',
    icon: Clock,
  },
  {
    name: 'Consultation History',
    href: '/doctor/consultations',
    icon: FileText,
  },
  {
    name: 'Surgical Cases',
    href: '/doctor/surgical-cases',
    icon: Scissors,
  },
  {
    name: 'My Patients',
    href: '/doctor/patients',
    icon: Users,
  },
  {
    name: 'My Profile',
    href: '/doctor/profile',
    icon: User,
  },
];

interface DoctorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorSidebar({ isOpen, onClose }: DoctorSidebarProps) {
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
    />
  );
}
