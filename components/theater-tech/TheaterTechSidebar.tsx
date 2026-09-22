'use client';

import {
  Activity,
  Building2,
  LayoutDashboard,
  Scissors,
  User,
  Users,
  Package,
  Stethoscope,
  FileText,
  Calendar,
  QrCode,
  ClipboardList,
  Receipt,
} from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

/**
 * Theater Tech Sidebar
 *
 * Theater ops + shared clinic front-desk capabilities (intake, appointments, billing).
 */

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/theater-tech/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },
  {
    name: 'Theater',
    href: '/theater-tech/theater',
    icon: Building2,
    section: 'Operations',
  },
  {
    name: 'Dayboard',
    href: '/theater-tech/dayboard',
    icon: Activity,
    section: 'Operations',
  },
  {
    name: 'Surgical Cases',
    href: '/theater-tech/surgical-cases',
    icon: Scissors,
    section: 'Operations',
  },
  {
    name: 'Patients',
    href: '/theater-tech/patients',
    icon: Users,
    section: 'Front Desk',
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
    name: 'Billing',
    href: '/frontdesk/billing',
    icon: Receipt,
    section: 'Front Desk',
  },
  {
    name: 'Services',
    href: '/theater-tech/services',
    icon: Stethoscope,
    section: 'Catalog',
  },
  {
    name: 'Procedures',
    href: '/theater-tech/procedures',
    icon: Scissors,
    section: 'Catalog',
  },
  {
    name: 'Inventory Hub',
    href: '/theater-tech/inventory',
    icon: Package,
    section: 'Inventory',
  },
  {
    name: 'Reports',
    href: '/theater-tech/inventory/reports',
    icon: FileText,
    section: 'Inventory',
  },
  {
    name: 'My Profile',
    href: '/theater-tech/profile',
    icon: User,
    section: 'Account',
  },
];

interface TheaterTechSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

export function TheaterTechSidebar({ isOpen, onClose, onCollapse }: TheaterTechSidebarProps) {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const userInfo: UserInfo | null = user
    ? { name: user.firstName || user.email, email: user.email, role: 'THEATER_TECHNICIAN' }
    : null;

  return (
    <UnifiedSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
      dashboardHref="/theater-tech/dashboard"
      onCollapse={onCollapse}
    />
  );
}
