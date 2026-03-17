'use client';

/**
 * Theater Technician Dashboard Layout
 *
 * Main layout for all theater tech pages.
 * Uses UnifiedSidebar with enhanced design and TheaterTechHeader.
 */

import { useState, ReactNode, useEffect } from 'react';
import { TheaterTechSidebar } from '@/components/theater-tech/TheaterTechSidebar';
import { TheaterTechHeader } from './_components/TheaterTechHeader';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { toast } from 'sonner';

interface TheaterTechLayoutProps {
  children: ReactNode;
}

export default function TheaterTechLayout({ children }: TheaterTechLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN') {
        toast.error('Access Denied: Theater Technician privileges required');
        router.replace('/patient/dashboard');
      }
    }
  }, [mounted, isLoading, user, router]);

  if (isLoading || !mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-stone-200 rounded-full mb-4" />
          <div className="h-4 w-32 bg-stone-100 rounded" />
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <TheaterTechSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:ml-[280px] flex flex-col min-w-0 h-full overflow-hidden">
        <TheaterTechHeader />

        <main className="flex-1 relative overflow-hidden focus:outline-none bg-gradient-to-b from-stone-50/80 via-white to-stone-50/40 overflow-y-auto overscroll-contain scroll-smooth">
          <div className="w-full min-h-full mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
