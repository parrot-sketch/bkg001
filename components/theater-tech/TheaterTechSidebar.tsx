'use client';

/**
 * Theater Tech Sidebar Navigation
 *
 * Uses the UnifiedSidebar component for consistent design.
 * Provides navigation for theater technician operations.
 */

import { Activity, LayoutDashboard, User, ClipboardList, Package, Boxes, Truck, ShoppingCart, FileText, BarChart3, Settings } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
  {
    name: 'Case Prep',
    href: '/theater-tech/dashboard',
    icon: ClipboardList,
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

interface TheaterTechSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TheaterTechSidebar({ isOpen, onClose }: TheaterTechSidebarProps) {
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
