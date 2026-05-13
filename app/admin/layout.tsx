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
import { Settings, Users, BarChart3, Calendar, FileText, Package, CreditCard, Stethoscope, Scissors, ShieldCheck } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { AdminHeader } from './_components/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading) {
        if (!user) {
            router.replace('/login');
        } else if (user.role !== 'ADMIN') {
            toast.error('Access Denied: Administrative privileges required');
            router.replace('/frontdesk/patients');
        }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
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
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <ShieldCheck className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapse={setSidebarCollapsed}
      />

      {/* Content Area */}
      <div
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 lg:ml-[var(--sidebar-offset)]"
        style={
          { '--sidebar-offset': sidebarCollapsed ? '4rem' : '280px' } as React.CSSProperties
        }
      >
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
