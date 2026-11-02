'use client';

/**
 * Doctor Dashboard Layout
 *
 * Main layout for all doctor dashboard pages.
 * Uses DoctorSidebar + DoctorHeader for consistent UX.
 * Wraps all doctor routes in OnboardingTourProvider.
 */

import { useState, ReactNode, useEffect } from 'react';
import { DoctorSidebar } from '@/components/doctor/DoctorSidebar';
import { DoctorHeader } from './_components/DoctorHeader';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { toast } from 'sonner';
import { OnboardingTourProvider } from '@/components/doctor/onboarding-tour/OnboardingTourContext';

interface DoctorLayoutProps {
  children: ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
        toast.error('Access Denied: Doctor privileges required');
        router.replace('/login');
      }
    }
  }, [isLoading, user, router]);

  const isOnboarding = pathname === '/doctor/onboarding';
  if (isOnboarding) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f0f4f5] w-full">
        <main className="flex-1 relative overflow-hidden focus:outline-none bg-[#f0f4f5] overflow-y-auto overscroll-contain scroll-smooth">
          <div className="w-full min-h-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <OnboardingTourProvider onboardingStatus={null}>
      <div className="flex h-screen overflow-hidden bg-[#2c2e4b]">
        {/* Sidebar */}
        <DoctorSidebar
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
          {pathname.startsWith('/doctor/consultations/session') ? (
            <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
          ) : (
            <>
          <div className="shrink-0 bg-[#2c2e4b]">
            <DoctorHeader onMenuClick={() => setSidebarOpen(true)} />
          </div>
          <main className="relative flex-1 overflow-hidden focus:outline-none">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg.webp')" }} aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#2c2e4b]/80 via-[#2c2e4b]/70 to-[#2c2e4b]/50" aria-hidden="true" />
            <div className="relative z-10 h-full overflow-y-auto overscroll-contain scroll-smooth">
              <div className="mx-auto min-h-full w-full max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
                {children}
              </div>
            </div>
          </main>
            </>
          )}
        </div>
      </div>
    </OnboardingTourProvider>
  );
}
