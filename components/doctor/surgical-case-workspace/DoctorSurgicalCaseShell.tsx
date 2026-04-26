'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileText, Receipt, Menu, ClipboardCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PatientInfoSidebar } from '@/components/doctor/surgical-case-workspace/PatientInfoSidebar';
import {
  DoctorSurgicalCaseWorkspaceProvider,
  type DoctorSurgicalCaseWorkspaceContextValue,
} from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'border border-slate-200 bg-slate-100 text-slate-700' },
  PLANNING: { label: 'Planning', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED: { label: 'Scheduled', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  IN_PREP: { label: 'In Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  IN_THEATER: { label: 'In Theater', className: 'border border-red-200 bg-red-50 text-red-700' },
  RECOVERY: { label: 'Recovery', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', className: 'border border-red-200 bg-red-50 text-red-700' },
};

const SECTIONS = [
  { hrefSuffix: 'case-plan', label: 'Case Plan', icon: ClipboardList },
  { hrefSuffix: 'preop-ward-checklist', label: 'Pre-op Checklist', icon: ClipboardCheck },
  { hrefSuffix: 'surgical-notes', label: 'Surgical Notes', icon: FileText },
  { hrefSuffix: 'operative-record', label: 'Operative Record', icon: FileText },
  { hrefSuffix: 'charge-sheet', label: 'Charge Sheet', icon: Receipt },
] as const;

export function DoctorSurgicalCaseShell({
  value,
  children,
}: {
  value: DoctorSurgicalCaseWorkspaceContextValue;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const status = (value.surgicalCase as { status?: string } | null)?.status || 'DRAFT';
  const statusCfg = STATUS_CONFIG[status] || {
    label: status,
    className: 'border border-slate-200 bg-slate-100 text-slate-700',
  };

  const baseHref = `/doctor/surgical-cases/${value.caseId}`;
  const activeSuffix = pathname?.split('/').filter(Boolean).slice(-1)[0] || 'case-plan';

  const Sidebar = () => (
    <div className="h-full overflow-hidden flex flex-col">
      <PatientInfoSidebar patient={value.patient} surgicalCase={value.surgicalCase} />
    </div>
  );

  return (
    <DoctorSurgicalCaseWorkspaceProvider value={value}>
      <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900">
        {/* Local header (inside the doctor layout) */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 shrink-0 gap-3">
          <div className="lg:hidden flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 mr-1" aria-label="Open patient sidebar">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px] flex flex-col">
                <SheetTitle className="sr-only">Patient</SheetTitle>
                <Sidebar />
              </SheetContent>
            </Sheet>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs shrink-0 pl-2 lg:pl-3 pr-3"
            asChild
          >
            <Link href="/doctor/surgical-cases">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cases</span>
            </Link>
          </Button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-sm font-semibold truncate">Surgical Case Workspace</h1>
            <Badge className={cn('shrink-0', statusCfg.className)}>{statusCfg.label}</Badge>
          </div>

          <div className="ml-auto hidden md:flex items-center gap-1.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = activeSuffix === s.hrefSuffix;
              return (
                <Button
                  key={s.hrefSuffix}
                  variant="ghost"
                  size="sm"
                  className={cn('h-9 gap-2 text-xs', isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500')}
                  onClick={() => router.push(`${baseHref}/${s.hrefSuffix}`)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Main body: patient sidebar + section content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[280px] bg-white border-r border-slate-200 shrink-0 hidden lg:flex flex-col overflow-hidden">
            <Sidebar />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Mobile section nav */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-3 py-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const isActive = activeSuffix === s.hrefSuffix;
                  return (
                    <button
                      key={s.hrefSuffix}
                      onClick={() => router.push(`${baseHref}/${s.hrefSuffix}`)}
                      className={cn(
                        'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">{children}</div>
          </div>
        </div>
      </div>
    </DoctorSurgicalCaseWorkspaceProvider>
  );
}

