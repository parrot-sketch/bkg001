'use client';

/**
 * Nurse Dashboard Layout
 * 
 * Main layout for all nurse dashboard pages.
 * Features: Responsive sidebar with desktop fold/unfold and mobile overlay.
 */

import { useState, ReactNode, useEffect } from 'react';
import { NurseSidebar } from '@/components/nurse/NurseSidebar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { toast } from 'sonner';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NurseLayoutProps {
  children: ReactNode;
}

export default function NurseLayout({ children }: NurseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isLoading } = useAuth();
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
      <NurseSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapse={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[var(--sidebar-offset)]"
        style={
          { '--sidebar-offset': sidebarCollapsed ? '4rem' : '280px' } as React.CSSProperties
        }
      >
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-slate-900">Nurse Dashboard</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 w-9 p-0"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-stone-50/80 via-white to-stone-50/40">
          <div className="w-full min-h-full mx-auto px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-6 lg:px-6 lg:py-7 xl:px-8 xl:py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
