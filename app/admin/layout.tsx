'use client';

/**
 * Admin Dashboard Layout
 * 
 * Main layout for all admin dashboard pages.
 * Uses UnifiedDashboardLayout for consistent design.
 */

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutDashboard, Settings, Users, BarChart3, Calendar, FileText, Package, CreditCard, Shield } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { AdminHeader } from './_components/AdminHeader';

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: BarChart3,
  },
  {
    name: 'Appointments',
    href: '/admin/appointments',
    icon: Calendar,
  },
  {
    name: 'Patients',
    href: '/admin/patients',
    icon: Users,
  },
  {
    name: 'Staff',
    href: '/admin/staff',
    icon: Shield,
  },
  {
    name: 'Inventory',
    href: '/admin/inventory',
    icon: Package,
  },
  {
    name: 'Billing',
    href: '/admin/billing',
    icon: CreditCard,
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: FileText,
  },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (mounted && !isLoading) {
        if (!user) {
            router.replace('/login');
        } else if (user.role !== 'ADMIN') {
            toast.error('Access Denied: Administrative privileges required');
            router.replace('/frontdesk/patients'); 
        }
    }
  }, [mounted, isLoading, user, router]);

  if (isLoading || !mounted) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-slate-200 rounded-full mb-4" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
            </div>
        </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const userInfo: UserInfo = {
    name: user.firstName || user.email,
    email: user.email,
    role: 'ADMIN',
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Button - Consistent positioning */}
      <button
        onClick={() => {
          // This will be handled by the sidebar state
          document.dispatchEvent(new CustomEvent('open-admin-sidebar'));
        }}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <Settings className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar */}
      <AdminSidebar isOpen={false} onClose={() => {}} />

      {/* Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0 h-full overflow-hidden">
        <AdminHeader />
        <main className="flex-1 relative overflow-hidden focus:outline-none bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40 overflow-y-auto overscroll-contain scroll-smooth">
            <div className="w-full min-h-full mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
              {children}
            </div>
        </main>
      </div>
    </div>
  );
}

// Admin Sidebar Wrapper
function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
