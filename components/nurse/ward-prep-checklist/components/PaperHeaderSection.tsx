'use client';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/nurse/ward-prep-checklist/fields';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Circle, FilePen, Lock } from 'lucide-react';
import { getAgeYears, formatSex } from '@/components/nurse/ward-prep-checklist/utils';

function formatDoctorName(name: string | null | undefined): string {
  if (!name) return '';
  return name.match(/^(Dr\.?|Dr\s)/i) ? name : `Dr. ${name}`;
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
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Top bar: status + actions */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isFinalized ? (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              Finalized
            </span>
          ) : isAmendment ? (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
              Amendment
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isFinalized && onStartAmendment && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={onStartAmendment}
            >
              <FilePen className="h-3.5 w-3.5" />
              Amend
            </Button>
          )}
        </div>
      </div>

      {/* Patient context: compact grid */}
      <div className="px-5 py-4 bg-slate-50/40 border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Patient</Label>
            <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{patientName}</p>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">File #</Label>
            <p className="text-sm font-medium text-slate-700 mt-0.5 font-mono">{patient.file_number}</p>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Age / Sex</Label>
            <p className="text-sm font-medium text-slate-700 mt-0.5">
              {getAgeYears(patient.date_of_birth)} / {formatSex(patient.gender)}
            </p>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Surgeon</Label>
            <p className="text-sm font-medium text-slate-700 mt-0.5 truncate">
              {surgeonName ? formatDoctorName(surgeonName) : '—'}
            </p>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Anaesthesiologist</Label>
            <p className="text-sm font-medium text-slate-700 mt-0.5 truncate">
              {anaesthesiologistName || '—'}
            </p>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</Label>
            <div className="mt-0.5">
              <DateField
                label=""
                value={headerDate}
                onChange={(v) => onHeaderDateChange(v)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Checklist Progress</span>
              <span className="font-medium text-slate-700">
                {progress.completedSections}/{progress.totalSections} sections
              </span>
            </div>
            <Progress value={progress.percent} className={progress.percent === 100 ? '[&>div]:bg-emerald-500' : ''} />
          </div>
        </div>
      </div>
    </div>
  );
}
