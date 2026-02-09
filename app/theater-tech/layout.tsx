'use client';

/**
 * Theater Technician Dashboard Layout
 *
 * Main layout for all theater tech pages.
 * Follows the same pattern as Doctor/Nurse layouts:
 * sidebar + ClinicalDashboardShell content area.
 */

import { useState } from 'react';
import { TheaterTechSidebar } from '@/components/theater-tech/TheaterTechSidebar';
import { Menu } from 'lucide-react';
import { ReactNode } from 'react';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';

interface TheaterTechLayoutProps {
  children: ReactNode;
}

export default function TheaterTechLayout({ children }: TheaterTechLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      {/* Sidebar */}
      <TheaterTechSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0 h-full overflow-hidden">
        <ClinicalDashboardShell>
          {children}
        </ClinicalDashboardShell>
      </div>
    </div>
  );
}
