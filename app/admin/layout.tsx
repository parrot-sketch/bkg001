'use client';

/**
 * Admin Dashboard Layout
 * 
 * Main layout for all admin dashboard pages.
 * Uses UnifiedSidebar via AdminSidebar and ClinicalDashboardShell.
 * Mobile-responsive with sidebar toggle functionality.
 */

import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Menu } from 'lucide-react';
import { ReactNode } from 'react';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
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
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <ClinicalDashboardShell>
          {children}
        </ClinicalDashboardShell>
      </div>
    </div>
  );
}
