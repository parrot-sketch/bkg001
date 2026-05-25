/**
 * PatientPageComponents
 *
 * Client-side helper components extracted from the patient profile page so
 * that `app/doctor/patients/[patientId]/page.tsx` only exports the default
 * `DoctorPatientProfilePage` (required by Next.js App Router's route type
 * generation — Next.js rejects `export const Foo = …` from route modules).
 *
 * Exports:
 *  PatientHeaderSkeleton, SidebarSkeleton, VisitSkeleton, NotesSkeleton
 *  PageError
 *  VisitCard
 *  ConsultationDocumentViewer (re-exported from dedicated module)
 */

'use client';

import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowRight, ArrowLeft, FileText, Thermometer, AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';
import { ConsultationDocumentViewer } from '@/components/patients/ConsultationDocumentViewer';

// Re-export
export { ConsultationDocumentViewer };

// ── Skeleton loaders ─────────────────────────────────────────────────

export function PatientHeaderSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="ml-2 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function VisitSkeleton() {
  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-2.5 w-2.5 rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3.5 w-20" />
        <div className="flex-1" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="space-y-2 pl-5">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

export function NotesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-28 mt-2" />
        </div>
      ))}
    </div>
  );
}

// ── Error ──────────────────────────────────────────────────────────────

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-rose-100">
      <AlertCircle className="h-8 w-8 text-rose-400 mb-3" />
      <p className="text-sm font-medium text-rose-600">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Retry
      </Button>
    </div>
  );
}

// ── VisitCard ─────────────────────────────────────────────────────────

export function VisitCard({
  visit,
  patientId,
}: {
  visit: VisitResponseDto;
  patientId: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const { sc, isActive, isCancelled } = useMemo(() => {
    const CFG: Record<
      string,
      { label: string; bg: string; text: string; dot: string }
    > = {
      COMPLETED:               { label: 'Completed',             bg: 'bg-emerald-50 text-emerald-705',    text: 'text-emerald-700',    dot: 'bg-emerald-500' },
      RELEASED:                { label: 'Released',              bg: 'bg-blue-50',       text: 'text-blue-700',       dot: 'bg-blue-500' },
      DISCHARGED:              { label: 'Discharged',            bg: 'bg-slate-50',      text: 'text-slate-650',      dot: 'bg-slate-400' },
      IN_CONSULTATION:         { label: 'In Consultation',       bg: 'bg-amber-50',      text: 'text-amber-700',      dot: 'bg-amber-500' },
      CHECKED_IN:              { label: 'Checked In',            bg: 'bg-sky-50',        text: 'text-sky-700',        dot: 'bg-sky-500' },
      READY_FOR_CONSULTATION:  { label: 'Ready',                bg: 'bg-emerald-50',    text: 'text-emerald-700',    dot: 'bg-emerald-400' },
      SCHEDULED:               { label: 'Scheduled',             bg: 'bg-amber-50',      text: 'text-amber-700',      dot: 'bg-amber-500' },
      CONFIRMED:               { label: 'Confirmed',             bg: 'bg-emerald-50',    text: 'text-emerald-700',    dot: 'bg-emerald-400' },
      PENDING:                 { label: 'Pending',               bg: 'bg-amber-50',      text: 'text-amber-700',      dot: 'bg-amber-500' },
      PENDING_DOCTOR_CONFIRMATION: { label: 'Awaiting MD',      bg: 'bg-amber-50',      text: 'text-amber-700',      dot: 'bg-amber-500' },
      CANCELLED:               { label: 'Cancelled',             bg: 'bg-stone-50',      text: 'text-stone-500',      dot: 'bg-stone-300' },
      NO_SHOW:                 { label: 'No Show',               bg: 'bg-rose-50',       text: 'text-rose-700',       dot: 'bg-rose-500' },
    };
    const sc = CFG[visit.status] ?? { label: visit.status, bg: 'bg-stone-50', text: 'text-stone-600', dot: 'bg-stone-300' };
    return {
      sc,
      isActive:    visit.status === 'IN_CONSULTATION',
      isCancelled: visit.status === 'CANCELLED',
    };
  }, [visit.status]);

  return (
    <div
      className={cn(
        'bg-white border rounded overflow-hidden transition-all',
        expanded && 'border-slate-350 shadow-sm',
        !expanded && 'border-slate-200 hover:border-slate-300 hover:shadow-xs',
        isActive && 'border-amber-300 ring-1 ring-amber-50',
        isCancelled && 'opacity-60',
      )}
    >
      {/* Header row */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-slate-50/50"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className={cn('w-2 h-2 rounded-full shrink-0', sc.dot)} />

        <span className="shrink-0 w-28 font-mono">
          <p className="text-xs font-bold text-slate-900">
            {format(new Date(visit.date), 'MMM d, yyyy')}
          </p>
          <p className="text-[10px] text-slate-400">
            {visit.time} <span className="mx-0.5">·</span>{' '}
            <span className="capitalize">{visit.type.toLowerCase()}</span>
          </p>
        </span>

        <span className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">Dr. {visit.doctor?.name || '—'}</p>
          {visit.consultation?.chiefComplaint && !expanded && (
            <p className="text-[10px] text-slate-400 truncate max-w-[260px]">
              {visit.consultation.chiefComplaint.replace(/<[^>]*>/g, '')}
            </p>
          )}
        </span>

        <Badge variant="outline" className={cn('text-[9px] font-extrabold uppercase py-0.5 px-2 border whitespace-nowrap rounded', sc.bg, sc.text)}>
          {sc.label}
        </Badge>

        {visit.consultationDuration != null && (
          <span className="text-[10px] text-slate-400 font-mono shrink-0">{visit.consultationDuration} min</span>
        )}

        <span className="text-slate-300 shrink-0 ml-1">
          {expanded
            ? <ArrowRight className="h-4 w-4 rotate-90" />
            : <ArrowRight className="h-4 w-4 -rotate-90" />}
        </span>

        <Link
          href={`/doctor/patients/${patientId}/visits/${visit.id}`}
          className="shrink-0 ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline">
            <FileText className="h-3 w-3" /> Full File
          </span>
        </Link>
      </button>

      {/* Expanded details (Consultation note inline) */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-4">
          <ConsultationDocumentViewer
            consultation={visit.consultation}
            appointmentDate={visit.date}
            appointmentTime={visit.time}
            appointmentType={visit.type}
          />
        </div>
      )}
    </div>
  );
}
