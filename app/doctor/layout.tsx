'use client';

/**
 * Doctor Dashboard Layout
 * 
 * Main layout for all doctor dashboard pages.
 * Includes sidebar navigation and content area.
 * Mobile-responsive with sidebar toggle functionality.
 */

import { useState } from 'react';
import { DoctorSidebar } from '@/components/doctor/DoctorSidebar';
import { Menu } from 'lucide-react';
import { ReactNode } from 'react';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { usePathname } from 'next/navigation';

interface DoctorLayoutProps {
  children: ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Check if current route is a consultation session
  const isConsultationSession = pathname?.includes('/consultations/') && pathname?.includes('/session');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar - Fixed position */}
      <DoctorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content Area - Using the shared ClinicalDashboardShell */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0 h-full overflow-hidden">
        <ClinicalDashboardShell variant={isConsultationSession ? 'immersive' : 'default'}>
          {children}
        </ClinicalDashboardShell>
      </div>
    </div>
  );
}
