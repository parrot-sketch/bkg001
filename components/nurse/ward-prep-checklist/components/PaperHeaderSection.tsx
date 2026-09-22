'use client';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/nurse/ward-prep-checklist/fields';
import { FilePen, Printer } from 'lucide-react';
import { getAgeYears, formatSex } from '@/components/nurse/ward-prep-checklist/utils';
import Link from 'next/link';

function formatDoctorName(name: string | null | undefined): string {
  if (!name) return '—';
  return name.match(/^(Dr\.?|Dr\s)/i) ? name : `Dr. ${name}`;
}

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 border-r border-slate-200 last:border-r-0 px-3 py-2.5 first:pl-0 last:pr-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900 truncate">{children}</div>
    </div>
  );
}

export function PaperHeaderSection(props: {
  caseId: string;
  patient: {
    first_name: string;
    last_name: string;
    file_number: string;
    date_of_birth?: string | Date | null;
    gender?: string | null;
  };
  surgeonName?: string | null;
  anaesthesiologistName?: string | null;
  headerDate: string | undefined;
  onHeaderDateChange: (date: string) => void;
  disabled: boolean;
  isFinalized: boolean;
  isAmendment: boolean;
  progress: { completedSections: number; totalSections: number; percent: number };
  onStartAmendment?: () => void;
}) {
  const {
    caseId,
    patient,
    surgeonName,
    anaesthesiologistName,
    headerDate,
    onHeaderDateChange,
    disabled,
    isFinalized,
    isAmendment,
    progress,
    onStartAmendment,
  } = props;

  const patientName = `${patient.first_name} ${patient.last_name}`.trim();

  return (
    <header className="border-b border-slate-300 pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Nairobi Sculpt Aesthetic Centre
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Pre-Operative Ward Check-List
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Perioperative nursing record — complete before transfer to theatre
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isFinalized ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1">
              Finalized
            </span>
          ) : isAmendment ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1">
              Amendment
            </span>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1">
              Draft · {progress.percent}%
            </span>
          )}

          {isFinalized && onStartAmendment && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 border-amber-300 text-amber-800 hover:bg-amber-50"
              onClick={onStartAmendment}
            >
              <FilePen className="h-3.5 w-3.5" />
              Amend
            </Button>
          )}

          <Button variant="outline" size="sm" className="gap-1.5 h-8" asChild>
            <Link href={`/nurse/ward-prep/${caseId}/checklist/print`} target="_blank" rel="noopener noreferrer">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Link>
          </Button>
        </div>
      </div>

      {/* Patient / case identity — tabular document header */}
      <div className="mt-5 border border-slate-300 bg-slate-50/60">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 divide-y lg:divide-y-0 divide-slate-200">
          <MetaCell label="Patient">{patientName || '—'}</MetaCell>
          <MetaCell label="File No.">
            <span className="font-mono">{patient.file_number || '—'}</span>
          </MetaCell>
          <MetaCell label="Age / Sex">
            {getAgeYears(patient.date_of_birth)} / {formatSex(patient.gender)}
          </MetaCell>
          <MetaCell label="Surgeon">{formatDoctorName(surgeonName)}</MetaCell>
          <MetaCell label="Anaesthesiologist">{anaesthesiologistName || '—'}</MetaCell>
          <div className="min-w-0 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Date</div>
            <div className="mt-0.5">
              <DateField label="" value={headerDate} onChange={onHeaderDateChange} disabled={disabled} />
            </div>
          </div>
        </div>
      </div>

      {!isFinalized && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span>Completion</span>
            <span className="font-medium tabular-nums">
              {progress.completedSections}/{progress.totalSections} sections
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 overflow-hidden">
            <div
              className={`h-full transition-all ${progress.percent === 100 ? 'bg-emerald-600' : 'bg-[#2c2e4b]'}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
