'use client';

/**
 * Responsive fix for 1920×1200 viewport:
 * - Removed inner div wrapper from <main> — DashboardShell already owns padding
 */

import { useState, ReactNode, useEffect } from 'react';
import { FrontdeskSidebar } from '@/components/frontdesk/FrontdeskSidebar';
import { FrontdeskHeader } from './_components/FrontdeskHeader';
import { BookAppointmentDialog } from '@/components/appointments/BookAppointmentDialog';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface FrontdeskLayoutProps {
  children: ReactNode;
}

export default function FrontdeskLayout({ children }: FrontdeskLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'FRONTDESK' && user.role !== 'ADMIN') {
        toast.error('Access Denied: Frontdesk privileges required');
        router.replace('/patient/dashboard');
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f4f5]">
        <div className="flex flex-col items-center gap-3">
          {/* Brand teal pulse ring */}
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full bg-[#0c5d69]/20 animate-ping" />
            <div className="relative h-10 w-10 rounded-full bg-[#0c5d69]/10 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-[#0c5d69]/40 animate-pulse" />
            </div>
          </div>
          <p className="text-xs text-[#0c5d69]/60 font-medium tracking-wide">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'FRONTDESK' && user.role !== 'ADMIN')) {
    return null;
  }

return (
    <div className="flex h-screen overflow-hidden bg-[#2c2e4b]">
      <FrontdeskSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapse={setSidebarCollapsed}
      />

      {/* Main content area */}
      <div
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 lg:ml-[var(--sidebar-offset)]"
        style={{ '--sidebar-offset': sidebarCollapsed ? '4rem' : '280px' } as React.CSSProperties}
      >
<div className="shrink-0 bg-white border-b border-[#e7d6bf]">
            <FrontdeskHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          </div>

        <BookAppointmentDialog />

        {/* Main scrollable content */}
        <main className="flex-1 relative overflow-hidden focus:outline-none overflow-y-auto overscroll-contain scroll-smooth">
          {/* Branded background for frontdesk */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg.webp')" }} aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2c2e4b]/80 via-[#2c2e4b]/70 to-[#2c2e4b]/50" aria-hidden="true" />
          <div className="relative w-full min-h-full mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}