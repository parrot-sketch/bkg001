/**
 * Loading skeletons for the frontdesk area. Each mirrors the spacing of the
 * component it stands in for, so content swaps in without layout shift.
 */

import type { ReactNode } from 'react';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { SidebarSkeleton } from '@/components/shared/SidebarSkeleton';
import { cn } from '@/lib/utils';

const ROW_WIDTHS = ['w-40', 'w-32', 'w-44', 'w-36', 'w-28'];

function widthAt(index: number): string {
  return ROW_WIDTHS[index % ROW_WIDTHS.length];
}

export function PipelineStatsSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-8"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[#e7d6bf] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e7d6bf] px-4 pb-2 pt-3">
            <ShimmerSkeleton className="h-3 w-20" />
            <ShimmerSkeleton className="size-7" />
          </div>
          <div className="px-4 pb-3 pt-3">
            <ShimmerSkeleton className="h-6 w-10" />
          </div>
        </div>
      ))}
    </section>
  );
}

/** Patient rows inside a queue card: name + meta line on the left, action on the right. */
export function QueueRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-[#e7d6bf]/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <ShimmerSkeleton className={cn('h-3.5', widthAt(i))} />
            <ShimmerSkeleton className="h-2.5 w-52 max-w-full" />
          </div>
          <ShimmerSkeleton className="h-8 w-24 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function QueueSectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-[#e7d6bf] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e7d6bf] px-4 py-3">
        <div className="flex items-center gap-2">
          <ShimmerSkeleton className="h-8 w-8 rounded-none" />
          <ShimmerSkeleton className="h-3.5 w-40" />
        </div>
        <ShimmerSkeleton className="h-5 w-7 rounded-none" />
      </div>
      <QueueRowsSkeleton rows={rows} />
    </div>
  );
}

/** Main column of the dashboard: arriving, awaiting assignment, live queue. */
export function DashboardMainSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <QueueSectionSkeleton rows={3} />
      <QueueSectionSkeleton rows={2} />
      <QueueSectionSkeleton rows={4} />
    </div>
  );
}

export function DoctorsTodayRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-lg border border-[#e7d6bf]/60 px-3 py-2"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <ShimmerSkeleton className={cn('h-3', widthAt(i + 1))} />
            <ShimmerSkeleton className="h-2 w-24" />
          </div>
          <ShimmerSkeleton className="h-7 w-12 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function DashboardSidebarSkeleton() {
  return (
    <>
      <div className="space-y-2 rounded-xl border border-[#e7d6bf]/60 bg-white p-2.5 shadow-sm">
        <ShimmerSkeleton className="h-9 w-full rounded-lg" />
        <ShimmerSkeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e7d6bf] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e7d6bf] px-4 py-3">
          <div className="flex items-center gap-2">
            <ShimmerSkeleton className="h-8 w-8 rounded-none" />
            <ShimmerSkeleton className="h-3.5 w-24" />
          </div>
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
        <div className="p-3">
          <DoctorsTodayRowsSkeleton />
        </div>
      </div>
    </>
  );
}

function PageHeadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <ShimmerSkeleton tone="dark" className="h-8 w-64 max-w-full lg:h-9" />
      <ShimmerSkeleton tone="dark" className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** Full dashboard page, mirroring DashboardShell with the frontdesk sidebar column. */
export function FrontdeskDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="flex min-h-screen w-full flex-col gap-4 px-4 pb-6 pt-1 sm:px-6 md:gap-6 md:pt-2 lg:pt-0 xl:px-6 xl:pb-5"
    >
      <PageHeadingSkeleton />
      <PipelineStatsSkeleton />
      <div className="flex flex-col items-start gap-4 xl:flex-row">
        <div className="w-full min-w-0 flex-1">
          <DashboardMainSkeleton />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-[320px] 2xl:w-[360px]">
          <DashboardSidebarSkeleton />
        </div>
      </div>
    </div>
  );
}

/** Generic list page (patients, appointments, …): heading, toolbar, table card. */
export function FrontdeskPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex w-full flex-col gap-4 px-4 pb-6 pt-1 sm:px-6 md:gap-6 md:pt-2 lg:pt-0"
    >
      <PageHeadingSkeleton />
      <div className="overflow-hidden rounded-xl border border-[#e7d6bf] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e7d6bf] px-4 py-3">
          <ShimmerSkeleton className="h-9 w-64 max-w-full rounded-lg" />
          <ShimmerSkeleton className="h-9 w-28 rounded-lg" />
          <ShimmerSkeleton className="ml-auto h-9 w-32 rounded-lg" />
        </div>
        <QueueRowsSkeleton rows={8} />
      </div>
    </div>
  );
}

/**
 * Whole frontdesk chrome (sidebar, header, branded background) around a page
 * skeleton; used while the client is still resolving the session.
 */
export function FrontdeskShellSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#2c2e4b]">
      <SidebarSkeleton />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden lg:ml-[280px]">
        <div className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#e7d6bf] bg-white px-4">
          <div className="flex items-center gap-3">
            <ShimmerSkeleton className="h-8 w-8 rounded-lg lg:hidden" />
            <ShimmerSkeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-3">
            <ShimmerSkeleton className="h-8 w-8 rounded-full" />
            <ShimmerSkeleton className="h-8 w-8 rounded-full" />
            <ShimmerSkeleton className="hidden h-3 w-24 sm:block" />
          </div>
        </div>
        <main className="relative flex-1 overflow-hidden">
          <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg.webp')" }} aria-hidden="true" />
          <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#2c2e4b]/80 via-[#2c2e4b]/70 to-[#2c2e4b]/50" aria-hidden="true" />
          <div className="relative z-10 mx-auto min-h-full w-full max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
