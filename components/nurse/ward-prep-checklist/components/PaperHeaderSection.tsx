'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateField, TextField } from '@/components/nurse/ward-prep-checklist/fields';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Circle, FilePen, Lock, Printer } from 'lucide-react';
import { getAgeYears, formatSex } from '@/components/nurse/ward-prep-checklist/utils';

function formatDoctorName(name: string | null | undefined): string {
  if (!name) return '';
  return name.match(/^(Dr\\.?|Dr\\s)/i) ? name : `Dr. ${name}`;
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
  nursingComments: string | undefined;
  onHeaderChange: (next: { date: string; nursingComments: string }) => void;
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
    nursingComments,
    onHeaderChange,
    disabled,
    isFinalized,
    isAmendment,
    progress,
    onStartAmendment,
  } = props;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          NAIROBI SCULPT AESTHETIC CENTRE
        </p>
        <h1 className="text-lg font-extrabold text-slate-900 mt-2">
          PRE-OPERATIVE WARD CHECK-LIST
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          All information should be filled in clearly before the patient is received in theatre
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {isFinalized ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                <Lock className="h-3 w-3" />
                Finalized
              </Badge>
            ) : isAmendment ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                <FilePen className="h-3 w-3" />
                Amendment
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Circle className="h-3 w-3" />
                Draft
              </Badge>
            )}

            <Button variant="outline" size="sm" className="gap-1.5 h-8" asChild>
              <a href={`/nurse/ward-prep/${caseId}/checklist/print`} target="_blank" rel="noopener noreferrer">
                <Printer className="h-3.5 w-3.5" />
                Print
              </a>
            </Button>

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

          <div className="min-w-[220px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Checklist Progress</span>
              <span className="font-medium">
                {progress.completedSections}/{progress.totalSections} sections complete
              </span>
            </div>
            <Progress value={progress.percent} className={progress.percent === 100 ? '[&>div]:bg-emerald-500' : ''} />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="PATIENT FILE NO." value={patient.file_number} onChange={() => {}} disabled />
          <TextField label="NAME" value={`${patient.first_name} ${patient.last_name}`.trim()} onChange={() => {}} disabled />
          <TextField label="AGE" value={getAgeYears(patient.date_of_birth)} onChange={() => {}} disabled />
          <TextField label="SEX" value={formatSex(patient.gender)} onChange={() => {}} disabled />
          <DateField
            label="DATE"
            value={headerDate}
            onChange={(v) => onHeaderChange({ date: v, nursingComments: nursingComments || '' })}
            disabled={disabled}
          />
          <TextField label="DOCTOR" value={surgeonName ? formatDoctorName(surgeonName) : '—'} onChange={() => {}} disabled />
          <TextField label="ANAESTHESIOLOGIST" value={anaesthesiologistName || '—'} onChange={() => {}} disabled />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">NURSING: ACTION/COMMENTS/OBSERVATIONS</Label>
          <Textarea
            value={nursingComments || ''}
            onChange={(e) => onHeaderChange({ date: headerDate || '', nursingComments: e.target.value })}
            disabled={disabled}
            className="bg-white text-sm resize-none"
            rows={3}
            placeholder="Enter nursing comments/observations…"
          />
        </div>
      </div>
    </div>
  );
}

