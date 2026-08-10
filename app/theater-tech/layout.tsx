'use client';

/**
 * Theater Technician Dashboard Layout
 *
 * Mirrors frontdesk/nurse shell for consistent branded experience:
 * - Navy background with /bg.webp + gradient overlay
 * - Sidebar collapse offset
 * - White header chrome
 * - Global BookAppointmentDialog
 * - Branded gold loading state
 */

import { useState, ReactNode, useEffect } from 'react';
import { TheaterTechSidebar } from '@/components/theater-tech/TheaterTechSidebar';
import { TheaterTechHeader } from './_components/TheaterTechHeader';
import { BookAppointmentDialog } from '@/components/appointments/BookAppointmentDialog';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { toast } from 'sonner';

interface TheaterTechLayoutProps {
  children: ReactNode;
}

export default function TheaterTechLayout({ children }: TheaterTechLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN') {
        toast.error('Access Denied: Theater Technician privileges required');
        router.replace('/login');
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2c2e4b]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full bg-[#caa26a]/20 animate-ping" />
            <div className="relative h-10 w-10 rounded-full bg-[#caa26a]/10 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-[#caa26a]/40 animate-pulse" />
            </div>
          </div>
          <p className="text-xs text-[#caa26a]/80 font-medium tracking-wide">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#2c2e4b]">
      <TheaterTechSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapse={setSidebarCollapsed}
      />

      <div
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 lg:ml-[var(--sidebar-offset)]"
        style={{ '--sidebar-offset': sidebarCollapsed ? '4rem' : '280px' } as React.CSSProperties}
      >
        <div className="shrink-0 bg-white border-b border-[#e7d6bf]">
          <TheaterTechHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        <BookAppointmentDialog />

        <main className="flex-1 relative overflow-hidden focus:outline-none overflow-y-auto overscroll-contain scroll-smooth">
          <div className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0" style={{ backgroundImage: "url('/bg.webp')" }} aria-hidden="true" />
          <div className="fixed inset-0 bg-gradient-to-br from-[#2c2e4b]/80 via-[#2c2e4b]/70 to-[#2c2e4b]/50 z-0" aria-hidden="true" />
          <div className="relative z-10 w-full min-h-full mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
