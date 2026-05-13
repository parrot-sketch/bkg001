'use client';

/**
 * Nurse Dashboard Layout
 *
 * Main layout for all nurse dashboard pages.
 * Uses NurseHeader for consistent design across all roles.
 */

import { useState, ReactNode, useEffect } from 'react';
import { NurseSidebar } from '@/components/nurse/NurseSidebar';
import { NurseHeader } from './_components/NurseHeader';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { toast } from 'sonner';

interface NurseLayoutProps {
  children: ReactNode;
}

export default function NurseLayout({ children }: NurseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'NURSE' && user.role !== 'ADMIN') {
        toast.error('Access Denied: Nurse privileges required');
        router.replace('/patient/dashboard');
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-stone-200 rounded-full mb-4" />
          <div className="h-4 w-32 bg-stone-100 rounded" />
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'NURSE' && user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      {/* Sidebar */}
      <NurseSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapse={setSidebarCollapsed}
      />

      {/* Content Area */}
      <div
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 lg:ml-[var(--sidebar-offset)]"
        style={
          { '--sidebar-offset': sidebarCollapsed ? '4rem' : '280px' } as React.CSSProperties
        }
      >
        {/* Header — consistent with Doctor/Theater Tech */}
        <NurseHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden focus:outline-none bg-gradient-to-b from-stone-50/80 via-white to-stone-50/40 overflow-y-auto overscroll-contain scroll-smooth">
          <div className="w-full min-h-full mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
