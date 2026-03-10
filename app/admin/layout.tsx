'use client';

/**
 * Admin Dashboard Layout
 * 
 * Main layout for all admin dashboard pages.
 * Uses UnifiedSidebar via AdminSidebar and ClinicalDashboardShell.
 * Mobile-responsive with sidebar toggle functionality.
 */

import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Menu } from 'lucide-react';
import { ReactNode } from 'react';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { AdminHeader } from './_components/AdminHeader';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (mounted && !isLoading) {
        if (!isAuthenticated) {
            router.replace('/login');
        } else if (user && user.role !== 'ADMIN') {
            toast.error('Access Denied: Administrative privileges required');
            router.replace('/frontdesk/patients'); 
        }
    }
  }, [mounted, isLoading, isAuthenticated, user, router]);

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

  // Final catch-all for unauthorized access before rendering
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar - Fixed position */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content Area - Using the shared ClinicalDashboardShell */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0 h-full overflow-hidden">
        <AdminHeader />
        <ClinicalDashboardShell className="py-6 sm:py-8 lg:py-10">
          {children}
        </ClinicalDashboardShell>
      </div>
    </div>
  );
}
