'use client';

/**
 * Nurse Dashboard Layout
 * 
 * Main layout for all nurse dashboard pages.
 * Uses UnifiedSidebar and ClinicalDashboardShell for consistent design.
 * Mobile-responsive with sidebar toggle functionality.
 */

import { useState, ReactNode, useEffect } from 'react';
import { NurseSidebar } from '@/components/nurse/NurseSidebar';
import { Menu } from 'lucide-react';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { toast } from 'sonner';

interface NurseLayoutProps {
  children: ReactNode;
}

export default function NurseLayout({ children }: NurseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth validation
  useEffect(() => {
    if (mounted && !isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'NURSE' && user.role !== 'ADMIN') {
        toast.error('Access Denied: Nurse privileges required');
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

  if (!user || (user.role !== 'NURSE' && user.role !== 'ADMIN')) {
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
      <NurseSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content Area - Using the shared ClinicalDashboardShell */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0 h-full overflow-hidden">
        <ClinicalDashboardShell>
          {children}
        </ClinicalDashboardShell>
      </div>
    </div>
  );
}
