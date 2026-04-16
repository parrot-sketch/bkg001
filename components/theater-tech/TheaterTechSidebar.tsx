'use client';

/**
 * Theater Tech Sidebar Navigation
 *
 * Uses the UnifiedSidebar component for consistent design.
 * Provides navigation for theater technician operations.
 */

import { Activity, LayoutDashboard, User, Package, Boxes, Truck, ShoppingCart, FileText, Scissors, ClipboardCheck, Users, Stethoscope, Building2 } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const baseNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/theater-tech/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Theater Scheduling',
    href: '/theater-tech/theater-scheduling',
    icon: ClipboardCheck,
  },
  {
    name: 'Theaters',
    href: '/theater-tech/theaters',
    icon: Building2,
  },
  {
    name: 'Surgical Cases',
    href: '/theater-tech/surgical-cases',
    icon: Scissors,
  },
  {
    name: 'Patients',
    href: '/theater-tech/patients',
    icon: Users,
  },
  {
    name: 'Dayboard',
    href: '/theater-tech/dayboard',
    icon: Activity,
  },
  {
    name: 'Item Catalog',
    href: '/theater-tech/inventory/items',
    icon: Package,
  },
  {
    name: 'Batches & Stock',
    href: '/theater-tech/inventory/batches',
    icon: Boxes,
  },
  {
    name: 'Vendors',
    href: '/theater-tech/inventory/vendors',
    icon: Truck,
  },
  {
    name: 'Purchase Orders',
    href: '/theater-tech/inventory/purchase-orders',
    icon: ShoppingCart,
  },
  {
    name: 'Goods Receipts',
    href: '/theater-tech/inventory/receipts',
    icon: FileText,
  },
  {
    name: 'My Profile',
    href: '/theater-tech/profile',
    icon: User,
  },
];

const adminNavItems: NavItem[] = [
  {
    name: 'Services',
    href: '/admin/services',
    icon: Stethoscope,
  },
  {
    name: 'Procedures',
    href: '/admin/procedures',
    icon: Scissors,
  },
];

interface TheaterTechSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TheaterTechSidebar({ isOpen, onClose }: TheaterTechSidebarProps) {
  const { logout, user } = useAuth();

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

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
    />
  );
}
