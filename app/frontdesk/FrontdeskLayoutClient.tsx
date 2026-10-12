'use client';

/**
 * Responsive fix for 1920×1200 viewport:
 * - Removed inner div wrapper from <main> — DashboardShell already owns padding
 */

import { useState, ReactNode, useEffect } from 'react';
import { FrontdeskSidebar } from '@/components/frontdesk/FrontdeskSidebar';
import { FrontdeskHeader } from './_components/FrontdeskHeader';
import { BookAppointmentDialog } from '@/components/appointments/BookAppointmentDialog';
import { FrontdeskSessionProvider } from '@/contexts/FrontdeskSessionContext';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FrontdeskDashboardSkeleton,
  FrontdeskPageSkeleton,
  FrontdeskShellSkeleton,
} from '@/components/frontdesk/FrontdeskSkeletons';

interface FrontdeskLayoutClientProps {
  children: ReactNode;
  /** Set when the server already verified a desk-role session from the auth cookie. */
  serverUserId: string | null;
}

const DESK_ROLES = ['FRONTDESK', 'NURSE', 'THEATER_TECHNICIAN', 'ADMIN'];

export function FrontdeskLayoutClient({ children, serverUserId }: FrontdeskLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!DESK_ROLES.includes(user.role)) {
        toast.error('Access Denied: Frontdesk privileges required');
        router.replace('/login');
      }
    }
  }, [isLoading, user, router]);

  // With a server-verified session, render the shell immediately instead of waiting
  // for the client auth state; the effect above still redirects if they disagree.
  if (isLoading && !serverUserId) {
    return (
      <FrontdeskShellSkeleton>
        {pathname === '/frontdesk/dashboard' ? <FrontdeskDashboardSkeleton /> : <FrontdeskPageSkeleton />}
      </FrontdeskShellSkeleton>
    );
  }

  if (!isLoading && (!user || !DESK_ROLES.includes(user.role))) {
    return null;
  }

  return (
    <FrontdeskSessionProvider value={serverUserId}>
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
            <div className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0" style={{ backgroundImage: "url('/bg.webp')" }} aria-hidden="true" />
            <div className="fixed inset-0 bg-gradient-to-br from-[#2c2e4b]/80 via-[#2c2e4b]/70 to-[#2c2e4b]/50 z-0" aria-hidden="true" />
            <div className="relative z-10 w-full min-h-full mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </FrontdeskSessionProvider>
  );
}
