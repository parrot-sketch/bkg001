'use client';

/**
 * Frontdesk Dashboard Layout
 * 
 * Main layout for all frontdesk dashboard pages.
 * Includes sidebar navigation and content area.
 * Mobile-responsive with sidebar toggle functionality.
 */

import { useState } from 'react';
import { FrontdeskSidebar } from '@/components/frontdesk/FrontdeskSidebar';
import { Menu } from 'lucide-react';
import { ReactNode } from 'react';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';

interface FrontdeskLayoutProps {
  children: ReactNode;
}

export default function FrontdeskLayout({ children }: FrontdeskLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Menu Button - REFACTORED: Better positioning to avoid overlaying content */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 right-3 z-50 lg:hidden p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar - Fixed position */}
      <FrontdeskSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content Area - Using the shared ClinicalDashboardShell */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <ClinicalDashboardShell>
          {children}
        </ClinicalDashboardShell>
      </div>
    </div>
  );
}
