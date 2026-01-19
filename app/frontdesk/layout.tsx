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
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 lg:hidden p-2 rounded-lg bg-card border border-border shadow-md hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar - Fixed position */}
      <FrontdeskSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - Offset by sidebar width on desktop only */}
      <main className="flex-1 lg:ml-64 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 lg:px-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
