'use client';

/**
 * DoctorVisitDetailPage
 *
 * Full visit details for a doctor viewing one specific patient visit.
 * Data is already scoped to the current doctor by the API layer
 * (`GET /api/patients/:id/visits` adds `doctor_id = doctor.id` unless
 * `?scope=all` is requested).

 * Layout:
 *  ── Header: patient name, visit date/time, back link
 *  ── Status badge, duration
 *  ── ConsultationDocumentViewer  ← primary section
 *  ── Vitals
 *  ── Diagnoses & Prescriptions
 *  ── Medical Record notes
 *  ── Billing
 */

import { use, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  FileText,
  Thermometer,
  Pill,
  DollarSign,
  Stethoscope,
  AlertCircle,
} from 'lucide-react';
import { ConsultationDocumentViewer } from '@/components/patients/ConsultationDocumentViewer';
import type { VisitResponseDto, VisitVital, VisitMedicalRecord } from '@/application/dtos/VisitResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

// ─── Types ─────────────────────────────────────────────────────────

interface PageParams {
  patientId: string;
  visitId: string;
}

// ─── Query hooks ───────────────────────────────────────────────────

const qkVisit = (patientId: string, visitId: number) =>
  ['doctor', 'patient', patientId, 'visit', visitId] as const;

function useVisitDetail(patientId: string, visitId: number, enabled: boolean) {
  return useQuery({
    queryKey: qkVisit(patientId, visitId),
    queryFn: async () => {
      const res = await apiClient.get<VisitResponseDto[]>(
        `/patients/${patientId}/visits`
      );
      if (!res.success) throw new Error((res as any).error || 'Failed to load visit');
      const visits = (res as any).data as VisitResponseDto[];
      const match = visits.find((v) => v.id === visitId);
      if (!match) throw new Error(`Visit ${visitId} not found`);
      return match;
    },
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled,
  });
}

// ─── Skeletons ─────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Consultation skeleton */}
      <div className="bg-white rounded-lg border border-stone-200 p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-px w-full bg-stone-100" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>

      {/* Vitals skeleton */}
      <div className="bg-white rounded-lg border border-stone-200 p-5 space-y-2">
        <Skeleton className="h-3.5 w-20" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ─── Helper: visit status config ───────────────────────────────────

function getVisitStatusConfig(status: string) {
  const MAP: Record<string, { label: string; bg: string; text: string }> = {
    COMPLETED:              { label: 'Completed',   bg: 'bg-emerald-50',   text: 'text-emerald-700'  },
    RELEASED:               { label: 'Released',    bg: 'bg-blue-50',      text: 'text-blue-700'     },
    DISCHARGED:             { label: 'Discharged',  bg: 'bg-slate-50',     text: 'text-slate-600'    },
    IN_CONSULTATION:        { label: 'In Consultation', bg: 'bg-amber-50', text: 'text-amber-700'   },
    CHECKED_IN:             { label: 'Checked In',  bg: 'bg-sky-50',       text: 'text-sky-700'      },
    READY_FOR_CONSULTATION: { label: 'Ready',      bg: 'bg-emerald-50',   text: 'text-emerald-700'  },
    SCHEDULED:              { label: 'Scheduled',   bg: 'bg-amber-50',     text: 'text-amber-700'    },
    CONFIRMED:              { label: 'Confirmed',   bg: 'bg-emerald-50',   text: 'text-emerald-700'  },
    PENDING:                { label: 'Pending',     bg: 'bg-amber-50',     text: 'text-amber-700'    },
    PENDING_DOCTOR_CONFIRMATION: { label: 'Awaiting MD', bg: 'bg-amber-50', text: 'text-amber-700'   },
    CANCELLED:              { label: 'Cancelled',   bg: 'bg-stone-50',     text: 'text-stone-500'    },
    NO_SHOW:                { label: 'No Show',     bg: 'bg-rose-50',      text: 'text-rose-700'     },
  };
  return MAP[status] ?? { label: status, bg: 'bg-stone-50', text: 'text-stone-600' };
}

// ─── Sub-components ────────────────────────────────────────────────

interface VitalsSectionProps {
  vitals: VisitVital[];
}

const VITALS_GRID: Record<string, { label: string; unit: string }> = {
  bodyTemperature: { label: 'Temp',      unit: '°C'    },
  systolic:        { label: 'BP Syst',   unit: 'mmHg'  },
  diastolic:       { label: 'BP Dia',    unit: 'mmHg'  },
  heartRate:       { label: 'HR',        unit: 'bpm'   },
  respiratoryRate: { label: 'RR',        unit: '/min' },
  oxygenSaturation: { label: 'SpO₂',    unit: '%'     },
  weight:          { label: 'Weight',    unit: 'kg'    },
  height:          { label: 'Height',    unit: 'cm'    },
};

function VitalsSection({ vitals }: VitalsSectionProps) {
  if (vitals.length === 0) return null;
  const latest = vitals[0];

  const entries = Object.entries(VITALS_GRID).filter(
    ([key]) => (latest as any)[key] != null
  );

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Thermometer className="h-4 w-4 text-rose-500" />
          Vitals
        </CardTitle>
        <p className="text-[10px] text-stone-400 -mt-1">
          Recorded {latest.recordedByName || 'System'} ·{' '}
          {format(new Date(latest.recordedAt), 'MMM d, yyyy h:mm a')}
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {entries.map(([key, { label, unit }]) => (
            <div
              key={key}
              className="bg-stone-50 rounded-lg px-3 py-2 flex flex-col gap-0.5"
            >
              <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-sm font-semibold text-stone-900">
                {(latest as any)[key]}
                <span className="text-stone-400 font-normal ml-0.5">{unit}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DiagnosesSectionProps {
  medicalRecords: VisitMedicalRecord[];
}

function DiagnosesSection({ medicalRecords }: DiagnosesSectionProps) {
  if (medicalRecords.every((mr) => mr.diagnoses.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-blue-500" />
          Diagnoses &amp; Prescriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        {medicalRecords.map((mr) =>
          mr.diagnoses.map((d) => (
            <div key={d.id} className="border-l-2 border-blue-200 pl-3 space-y-1">
              <p className="text-sm font-semibold text-stone-900">{d.diagnosis}</p>
              {d.symptoms && (
                <p className="text-xs text-stone-500">
                  <span className="font-medium text-stone-600">Symptoms:</span> {d.symptoms}
                </p>
              )}
              {d.prescribedMedications && (
                <p className="text-xs text-blue-700 flex items-start gap-1.5">
                  <Pill className="h-3 w-3 mt-0.5 shrink-0" />
                  {d.prescribedMedications}
                </p>
              )}
              {d.followUpPlan && (
                <p className="text-xs text-stone-400">Follow-up: {d.followUpPlan}</p>
              )}
            </div>
          ))
        )}
        {medicalRecords[0]?.treatmentPlan && (
          <p className="text-xs text-stone-600 pt-2 border-t border-stone-100">
            <span className="font-medium">Treatment Plan:</span> {medicalRecords[0]!.treatmentPlan}
          </p>
        )}
        {medicalRecords[0]?.labRequest && (
          <p className="text-xs text-stone-600">
            <span className="font-medium">Lab Request:</span> {medicalRecords[0]!.labRequest}
          </p>
        )}
        {medicalRecords[0]?.notes && (
          <p className="text-xs text-stone-500 mt-1 pt-1 border-t border-stone-100">
            <span className="font-medium text-stone-600">Notes:</span> {medicalRecords[0]!.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── VisitInfoBar ──────────────────────────────────────────────────
// Header strip: patient name, date, time, type, status, back button

interface VisitInfoBarProps {
  patientName: string;
  doctorName: string | null;
  date: string;
  time: string;
  type: string;
  status: string;
  durationMinutes: number | null;
  onBack: () => void;
}

function VisitInfoBar({
  patientName,
  doctorName,
  date,
  time,
  type,
  status,
  durationMinutes,
  onBack,
}: VisitInfoBarProps) {
  const sc = getVisitStatusConfig(status);

  return (
    <div className="flex items-center gap-3 animate-in fade-in duration-200">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-8 text-xs text-stone-500"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
        Back
      </Button>

      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-lg font-semibold text-stone-900">{patientName}</h1>
        <Badge
          variant="outline"
          className={cn('text-[10px] font-bold py-0 h-5 border', sc.bg, sc.text)}
        >
          {sc.label}
        </Badge>
      </div>

      <div className="ml-auto flex items-center gap-3 text-[10px] text-stone-400">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(date), 'EEE, MMM d, yyyy')}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {time}
        </span>
        <span className="capitalize">{type.toLowerCase()}</span>
        {doctorName && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            Dr. {doctorName}
          </span>
        )}
        {durationMinutes != null && (
          <span>{durationMinutes} min</span>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function DoctorVisitDetailPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const patientId  = resolvedParams.patientId;
  const rawVisitId  = resolvedParams.visitId;
  const visitId     = parseInt(rawVisitId, 10);
  const router      = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const enabled = isAuthenticated && !!patientId && !isNaN(visitId);

  const {
    data: visit,
    isLoading,
    error,
    refetch,
  } = useVisitDetail(patientId, visitId, enabled);

  // ── Auth guard ─────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center animate-in fade-in">
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
          <p className="text-sm text-slate-400 mt-3">Checking authentication…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-3 animate-in fade-in">
          <p className="text-sm text-slate-500">Please log in to view visit details</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  // ── Not found / error ───────────────────────────────────────────

  if (error || !visit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-3">
          <FileText className="h-5 w-5 text-stone-300" />
        </div>
        <p className="text-sm font-medium text-stone-600">
          {error instanceof Error ? error.message : 'Visit not found'}
        </p>
        <p className="text-xs text-stone-400 mt-1">
          This visit may not belong to you or no longer exists.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push(`/doctor/patients/${patientId}`)}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Patient Profile
        </Button>
      </div>
    );
  }

  // ── Rendered ────────────────────────────────────────────────────

  const patientName = `${visit.doctor?.name || 'Patient'}`;
  const hasVitals    = visit.vitals.length > 0;
  const hasDiags     = visit.medicalRecords.some((mr) => mr.diagnoses.length > 0);
  const hasBilling   = Boolean(visit.billing);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <VisitInfoBar
        patientName={patientName}
        doctorName={visit.doctor?.name || null}
        date={visit.date}
        time={visit.time}
        type={visit.type}
        status={visit.status}
        durationMinutes={visit.consultationDuration}
        onBack={() => router.push(`/doctor/patients/${patientId}`)}
      />

      <div className="h-px bg-stone-100" />

      {/* ── Consultation Document  ← PRIMARY CONTENT ─────────────── */}
      <ConsultationDocumentViewer
        consultation={visit.consultation}
        appointmentDate={visit.date}
        appointmentTime={visit.time}
        appointmentType={visit.type}
      />

      {/* ── Vitals ───────────────────────────────────────────────── */}
      <VitalsSection vitals={visit.vitals} />

      {/* ── Diagnoses & Prescriptions ─────────────────────────────── */}
      <DiagnosesSection medicalRecords={visit.medicalRecords} />

      {/* ── Visit Note ────────────────────────────────────────────── */}
      {visit.note && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Visit Note
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
              {visit.note}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Billing ──────────────────────────────────────────────── */}
      {hasBilling && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-2 text-sm">
              {visit.billing!.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-stone-50 last:border-0"
                >
                  <span className="text-stone-600">
                    {item.serviceName} × {item.quantity}
                  </span>
                  <span className="font-medium text-stone-800">
                    {item.totalCost.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 mt-2">
                <span className="text-xs font-semibold text-stone-700">Total</span>
                <span className="text-sm font-bold text-stone-900">
                  {visit.billing!.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>Paid: {visit.billing!.amountPaid.toLocaleString()}</span>
                <span className="capitalize">{visit.billing!.status.toLowerCase()}</span>
              </div>
              {visit.billing!.amountPaid > 0 &&
                visit.billing!.amountPaid < visit.billing!.totalAmount && (
                  <p className="text-[10px] text-amber-600 pt-1">
                    Balance due:{' '}
                    {(visit.billing!.totalAmount - visit.billing!.amountPaid).toLocaleString()}
                  </p>
                )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
