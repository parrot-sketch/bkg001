'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Receipt,
  ClipboardCheck,
  Stethoscope,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DoctorSurgicalCaseWorkspaceProvider,
  type DoctorSurgicalCaseWorkspaceContextValue,
} from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';
import { getSurgicalCaseStatusDisplay } from '@/lib/surgical-case-status-display';

/** Doctor-owned documents currently in scope */
const DOCTOR_DOCS = [
  { hrefSuffix: 'case-plan', label: 'Case Plan', icon: ClipboardList },
  { hrefSuffix: 'surgical-notes', label: 'Surgical Notes', icon: FileText },
  { hrefSuffix: 'operative-record', label: 'Operative Note', icon: Stethoscope },
] as const;

/** Shared / reference — not nurse write surfaces */
const SECONDARY = [
  { hrefSuffix: 'charge-sheet', label: 'Charges', icon: Receipt },
  { hrefSuffix: 'preop-ward-checklist', label: 'Nurse Pre-op', icon: ClipboardCheck, reference: true },
] as const;

type PatientLite = {
  first_name?: string | null;
  last_name?: string | null;
  file_number?: string | null;
};

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
  const statusCfg = getSurgicalCaseStatusDisplay(status);
  const patient = value.patient as PatientLite | null;
  const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(' ') || 'Patient';

  const baseHref = `/doctor/surgical-cases/${value.caseId}`;
  const activeSuffix = pathname?.split('/').filter(Boolean).slice(-1)[0] || 'case-plan';

  const NavPill = ({
    hrefSuffix,
    label,
    icon: Icon,
    reference,
  }: {
    hrefSuffix: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    reference?: boolean;
  }) => {
    const isActive = activeSuffix === hrefSuffix;
    return (
      <button
        type="button"
        onClick={() => router.push(`${baseHref}/${hrefSuffix}`)}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          isActive
            ? 'bg-[#2c2e4b] text-white'
            : reference
              ? 'border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50'
              : 'text-slate-600 hover:bg-[#e7d6bf]/40 hover:text-[#2c2e4b]',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  };

  return (
    <DoctorSurgicalCaseWorkspaceProvider value={value}>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#f7f4ef] text-slate-900">
        <header className="sticky top-0 z-30 shrink-0 border-b border-[#2c2e4b]/10 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-2 text-xs text-slate-600"
              asChild
            >
              <Link href="/doctor/surgical-cases">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cases</span>
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-[#2c2e4b] md:text-base">
                  {patientName}
                </h1>
                <Badge className={cn('shrink-0', statusCfg.className)}>{statusCfg.label}</Badge>
              </div>
              {patient?.file_number ? (
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{patient.file_number}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 px-3 py-2 md:px-6 lg:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#caa26a]">
              Doctor documents
            </p>
            <nav className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {DOCTOR_DOCS.map((s) => (
                <NavPill key={s.hrefSuffix} {...s} />
              ))}
            </nav>
            <nav className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {SECONDARY.map((s) => (
                <NavPill key={s.hrefSuffix} {...s} />
              ))}
            </nav>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </DoctorSurgicalCaseWorkspaceProvider>
  );
}
