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

/**
 * Responsive fixes for 1920×1200 viewport (ThinkPad X1 Carbon at 100% zoom):
 * - Header h1: text-3xl sm:text-4xl → text-2xl lg:text-3xl (scaling down one step)
 * - Sidebar width: lg:w-[380px] → xl:w-[340px] 2xl:w-[380px] (kicks in later)
 * - Container padding: px-4 sm:px-6 lg:px-8 py-6 → xl:px-6 xl:py-5
 * - Grid gap: gap-5 → gap-4 at xl breakpoint
 * - Subtitle: text-sm sm:text-base → add lg:text-sm to keep compact
 * 
 * Reusable Dashboard Layout Shell — Nairobi Sculpt Brand
 * Clean, clinical light theme: white surfaces, teal (#0c5d69) accents,
 * gold (#DFAC0D) highlights, near-white backgrounds.
 */
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
    <div className="@container/main flex flex-col gap-4 md:gap-6 w-full px-4 sm:px-6 xl:px-6 py-6 xl:py-5 bg-[#a3a3a28a] min-h-screen">
      {/* Banner/Alerts Slot (full width) */}
      {banner && <div className="w-full animate-fade-in">{banner}</div>}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0c5d69]/15 pb-4 mb-1.5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#121c1d] lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#0c5d69]/70 font-medium text-sm lg:text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {headerActions}
          </div>
        )}
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
              'flex flex-col gap-4 w-full shrink-0',
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
