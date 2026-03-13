'use client';

/**
 * Frontdesk Dashboard Layout
 * 
 * Main layout for all frontdesk dashboard pages.
 * Uses UnifiedSidebar and ClinicalDashboardShell for consistent design.
 * Mobile-responsive with sidebar toggle functionality.
 */

import { useState, ReactNode, useEffect } from 'react';
import { FrontdeskSidebar } from '@/components/frontdesk/FrontdeskSidebar';
import { Menu } from 'lucide-react';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { BookAppointmentDialog } from '@/components/appointments/BookAppointmentDialog';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface FrontdeskLayoutProps {
  children: ReactNode;
}

export default function FrontdeskLayout({ children }: FrontdeskLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth validation
  useEffect(() => {
    if (mounted && !isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'FRONTDESK' && user.role !== 'ADMIN') {
        toast.error('Access Denied: Frontdesk privileges required');
        router.replace('/patient/dashboard');
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

  if (!user || (user.role !== 'FRONTDESK' && user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Button - CONSISTENT positioning (top-4 left-4) */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar - Fixed position */}
      <FrontdeskSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content Area - Using the shared ClinicalDashboardShell */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global Modals for Frontdesk */}
        <BookAppointmentDialog />

        <ClinicalDashboardShell>
          {children}
        </ClinicalDashboardShell>
      </div>
    </div>
  );
}
