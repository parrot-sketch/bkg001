'use client';

/**
 * Nurse Sidebar
 *
 * Clean sections:
 * - Overview / Journey (clinical)
 * - Front desk (shared clinic ops — same capabilities as frontdesk)
 * - Account
 */

import {
  LayoutDashboard,
  ClipboardList,
  User,
  Bell,
  Activity,
  HeartPulse,
  FolderKanban,
  Users,
  Calendar,
  QrCode,
  Building2,
  Receipt,
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
    name: 'Patients',
    href: '/nurse/patients',
    icon: Users,
    section: 'Patient Care',
  },
  {
    name: 'Appointments',
    href: '/frontdesk/appointments',
    icon: Calendar,
    section: 'Front Desk',
  },
  {
    name: 'Patient Intake',
    href: '/frontdesk/intake/start',
    icon: QrCode,
    section: 'Front Desk',
  },
  {
    name: 'Pending Intakes',
    href: '/frontdesk/intake/pending',
    icon: ClipboardList,
    section: 'Front Desk',
  },
  {
    name: 'Theater Schedule',
    href: '/frontdesk/theater-scheduling',
    icon: Building2,
    section: 'Front Desk',
  },
  {
    name: 'Billing',
    href: '/frontdesk/billing',
    icon: Receipt,
    section: 'Front Desk',
  },
  {
    name: 'Surgical Cases',
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
