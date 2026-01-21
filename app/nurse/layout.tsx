/**
 * Nurse Dashboard Layout
 * 
 * Main layout for all nurse dashboard pages.
 * Includes sidebar navigation and content area.
 * Mobile-responsive with sidebar toggle functionality.
 */

'use client';

import { useState } from 'react';
import { NurseSidebar } from '@/components/nurse/NurseSidebar';
import { Menu } from 'lucide-react';
import { ReactNode } from 'react';

interface NurseLayoutProps {
  children: ReactNode;
}

export default function NurseLayout({ children }: NurseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-md hover:bg-muted transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Sidebar - Handles its own overlay and positioning */}
      <NurseSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - Offset by sidebar width on desktop (256px = w-64) */}
      <main className="flex-1 overflow-y-auto lg:ml-64 w-full">
        <div className="container mx-auto px-4 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
