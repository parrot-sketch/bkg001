/**
 * Patient Dashboard Layout
 * 
 * Main layout for all patient dashboard pages.
 * Includes sidebar navigation and content area.
 * Mobile-optimized with collapsible sidebar.
 */

'use client';

import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface PatientLayoutProps {
  children: ReactNode;
}

export default function PatientLayout({ children }: PatientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-border shadow-md hover:bg-gray-50 transition-colors"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <X className="h-5 w-5 text-slate-900" />
        ) : (
          <Menu className="h-5 w-5 text-slate-900" />
        )}
      </button>

      {/* Sidebar - Hidden on mobile when closed */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          h-screen w-64 flex-shrink-0 
          border-r border-border bg-white 
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <PatientSidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content - Automatically respects sidebar width with flex-1 */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white lg:ml-0">
        <div className="h-full px-4 pt-16 pb-8 sm:pt-8 sm:px-4 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
