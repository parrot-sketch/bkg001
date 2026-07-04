import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  banner?: ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarClassName?: string;
  mobileActions?: ReactNode;
}

/* Reusable Dashboard Layout Shell — Nairobi Sculpt Brand */
export function DashboardShell({
  banner,
  title,
  subtitle,
  headerActions,
  stats,
  children,
  sidebar,
  sidebarClassName,
  mobileActions,
}: DashboardShellProps) {
  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full px-4 sm:px-6 xl:px-6 pt-1 md:pt-2 lg:pt-0 pb-6 xl:pb-5 min-h-screen">
      {/* Banner/Alerts Slot (full width) */}
      {banner && <div className="w-full animate-fade-in">{banner}</div>}

      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm sm:text-base lg:text-sm text-white/70">{subtitle}</p>}
      </div>

      {/* Stats/Pipeline Cards Slot */}
      {stats && <div className="w-full">{stats}</div>}

      {/* Main Content Grid */}
      <div className="flex flex-col gap-4 xl:flex-row items-start">
        {/* Main Column */}
        <div className="flex-1 w-full min-w-0">
          {children}
        </div>

        {/* Sidebar Column */}
        {sidebar && (
          <div
            className={cn(
              'flex flex-col gap-3 w-full shrink-0',
              sidebarClassName || 'xl:w-[340px] 2xl:w-[380px]'
            )}
          >
            {sidebar}
          </div>
        )}
      </div>

      {/* Mobile/Quick Actions Slot */}
      {mobileActions && (
        <section className="sm:hidden space-y-3 pt-2">
          {mobileActions}
        </section>
      )}
    </div>
  );
}
