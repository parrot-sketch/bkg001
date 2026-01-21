/**
 * Patient Dashboard Layout
 * 
 * Main layout for all patient dashboard pages.
 * Includes sidebar navigation and content area.
 * Mobile-optimized with collapsible sidebar and prominent menu button.
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Header Bar - Always visible on mobile */}
      <div className="fixed top-0 left-0 right-0 z-50 lg:hidden h-16 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo/Brand - Compact for mobile */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">NS</span>
            </div>
            <span className="text-base font-semibold text-slate-900 font-playfair-display">
              Nairobi Sculpt
            </span>
          </div>

          {/* Menu Button - Prominent, large touch target */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-700 transition-all duration-200 shadow-md active:shadow-sm"
            aria-label="Toggle navigation menu"
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <X className="h-6 w-6" strokeWidth={2.5} />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* Sidebar - Hidden on mobile when closed */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          h-screen w-64 flex-shrink-0 
          border-r border-border bg-white 
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:shadow-none shadow-xl
        `}
      >
        <PatientSidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content - Automatically respects sidebar width with flex-1 */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50 lg:bg-white lg:ml-0">
        <div className="h-full px-4 pt-20 pb-8 sm:px-4 lg:pt-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
