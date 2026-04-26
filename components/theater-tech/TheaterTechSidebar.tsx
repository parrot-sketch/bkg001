'use client';

/**
 * Theater Tech Sidebar Navigation
 *
 * Uses the UnifiedSidebar component for consistent design.
 * Provides navigation for theater technician operations.
 */

import { Activity, LayoutDashboard, User, Package, Boxes, Truck, ShoppingCart, FileText, Scissors, ClipboardCheck, Users, Stethoscope, Building2, Calendar } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const baseNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/theater-tech/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },
  {
    name: 'Theater Scheduling',
    href: '/theater-tech/theater-scheduling',
    icon: ClipboardCheck,
    section: 'Operations',
  },
  {
    name: 'Theaters',
    href: '/theater-tech/theaters',
    icon: Building2,
    section: 'Operations',
  },
  {
    name: 'Surgical Cases',
    href: '/theater-tech/surgical-cases',
    icon: Scissors,
    section: 'Planning',
  },
  {
    name: 'Upcoming Procedures',
    href: '/theater-tech/upcoming-procedures',
    icon: Calendar,
    section: 'Planning',
  },
  {
    name: 'Recent Consultations',
    href: '/theater-tech/recent-consultations',
    icon: FileText,
    section: 'Planning',
  },
  {
    name: 'Patients',
    href: '/theater-tech/patients',
    icon: Users,
    section: 'Planning',
  },
  {
    name: 'Dayboard',
    href: '/theater-tech/dayboard',
    icon: Activity,
    section: 'Operations',
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
    name: 'Item Catalog',
    href: '/theater-tech/inventory/items',
    icon: Package,
    section: 'Inventory',
  },
  {
    name: 'Batches & Stock',
    href: '/theater-tech/inventory/batches',
    icon: Boxes,
    section: 'Inventory',
  },
  {
    name: 'Vendors',
    href: '/theater-tech/inventory/vendors',
    icon: Truck,
    section: 'Inventory',
  },
  {
    name: 'Purchase Orders',
    href: '/theater-tech/inventory/purchase-orders',
    icon: ShoppingCart,
    section: 'Inventory',
  },
  {
    name: 'Goods Receipts',
    href: '/theater-tech/inventory/receipts',
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

  const navItems = baseNavItems;

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
      onCollapse={onCollapse}
    />
  );
}
