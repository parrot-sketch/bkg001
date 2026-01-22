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
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { ReactNode } from 'react';

interface FrontdeskLayoutProps {
  children: ReactNode;
}

export default function FrontdeskLayout({ children }: FrontdeskLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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

      {/* Main Content - Offset by sidebar width on desktop only */}
      {/* REFACTORED: Improved mobile padding for better space utilization */}
      <main className="flex-1 lg:ml-64 overflow-y-auto">
        <div className="w-full px-3 sm:px-4 py-3 sm:py-4 lg:px-6 lg:py-8 xl:px-8 2xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
