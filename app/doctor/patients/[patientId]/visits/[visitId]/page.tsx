'use client';

/**
 * DoctorVisitDetailPage
 *
 * Full visit details for a doctor viewing one specific patient visit.
 * Data is already scoped to the current doctor by the API layer.
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
  User,
  FileText,
  Thermometer,
  Pill,
  DollarSign,
  StickyNote,
} from 'lucide-react';
import { ConsultationDocumentViewer } from '@/components/patients/ConsultationDocumentViewer';
import type {
  VisitResponseDto,
  VisitVital,
  VisitMedicalRecord,
  VisitBilling,
} from '@/application/dtos/VisitResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

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

function useVisitPatient(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['doctor', 'patient', patientId],
    queryFn: async () => {
      const res = await apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
      if (!res.success) throw new Error((res as any).error || 'Failed to load patient');
      return (res as any).data as PatientResponseDto;
    },
    staleTime: 60_000,
    gcTime: 120_000,
    retry: 1,
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
        <Skeleton className="h-9 w-9 rounded-lg bg-white/10" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>
      </div>

      {/* Consultation skeleton */}
      <div className="bg-white rounded-xl border border-[#e7d6bf] p-5 space-y-3">
        <Skeleton className="h-4 w-32 bg-[#e7d6bf]/30" />
        <Skeleton className="h-3.5 w-full bg-[#e7d6bf]/30" />
        <Skeleton className="h-3.5 w-full bg-[#e7d6bf]/30" />
        <Skeleton className="h-px w-full bg-[#e7d6bf]/20" />
        <Skeleton className="h-3.5 w-full bg-[#e7d6bf]/30" />
      </div>
    </div>
  );
}

// ─── Helper: visit status config ───────────────────────────────────

function getVisitStatusConfig(status: string) {
  const MAP: Record<string, { label: string; bg: string; text: string }> = {
    COMPLETED:              { label: 'Completed',   bg: 'bg-emerald-500/10 border-emerald-500/20',   text: 'text-emerald-400'  },
    RELEASED:               { label: 'Released',    bg: 'bg-blue-500/10 border-blue-500/20',      text: 'text-blue-400'     },
    DISCHARGED:             { label: 'Discharged',  bg: 'bg-white/10 border-white/15',     text: 'text-white/80'    },
    IN_CONSULTATION:        { label: 'In Consultation', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400'   },
    CHECKED_IN:             { label: 'Checked In',  bg: 'bg-sky-500/10 border-sky-500/20',       text: 'text-sky-400'      },
    READY_FOR_CONSULTATION: { label: 'Ready',      bg: 'bg-emerald-500/10 border-emerald-500/20',   text: 'text-emerald-400'  },
    SCHEDULED:              { label: 'Scheduled',   bg: 'bg-amber-500/10 border-amber-500/20',     text: 'text-amber-400'    },
    CONFIRMED:              { label: 'Confirmed',   bg: 'bg-emerald-500/10 border-emerald-500/20',   text: 'text-emerald-400'  },
    PENDING:                { label: 'Pending',     bg: 'bg-amber-500/10 border-amber-500/20',     text: 'text-amber-400'    },
    PENDING_DOCTOR_CONFIRMATION: { label: 'Awaiting MD', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400'   },
    CANCELLED:              { label: 'Cancelled',   bg: 'bg-white/10 border-white/15',     text: 'text-white/60'    },
    NO_SHOW:                { label: 'No Show',     bg: 'bg-rose-500/10 border-rose-500/20',      text: 'text-rose-400'     },
  };
  return MAP[status] ?? { label: status, bg: 'bg-white/10 border-white/15', text: 'text-white/70' };
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
    <Card className="border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-bold text-[#2c2e4b] flex items-center gap-1.5">
          <Thermometer className="h-4 w-4 text-rose-500" />
          Vitals
        </CardTitle>
        <p className="text-[10px] text-[#2c2e4b]/40 -mt-1 font-semibold uppercase tracking-wider">
          Recorded {latest.recordedByName || 'System'} ·{' '}
          {format(new Date(latest.recordedAt), 'MMM d, yyyy h:mm a')}
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {entries.map(([key, { label, unit }]) => (
            <div
              key={key}
              className="bg-[#e7d6bf]/10 border border-[#e7d6bf]/30 rounded-lg px-3 py-2 flex flex-col gap-0.5"
            >
              <span className="text-[9px] font-bold text-[#2c2e4b]/40 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-sm font-semibold text-[#2c2e4b]">
                {(latest as any)[key]}
                <span className="text-[#2c2e4b]/40 font-normal ml-0.5">{unit}</span>
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
    <Card className="border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-bold text-[#2c2e4b] flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-blue-500" />
          Diagnoses &amp; Prescriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        {medicalRecords.map((mr) =>
          mr.diagnoses.map((d) => (
            <div key={d.id} className="border-l-2 border-[#caa26a] pl-3 space-y-1.5">
              <p className="text-sm font-semibold text-[#2c2e4b]">{d.diagnosis}</p>
              {d.symptoms && (
                <p className="text-xs text-[#2c2e4b]/70">
                  <span className="font-semibold text-[#2c2e4b]">Symptoms:</span> {d.symptoms}
                </p>
              )}
              {d.prescribedMedications && (
                <p className="text-xs text-blue-700 flex items-start gap-1.5 font-medium">
                  <Pill className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-600" />
                  {d.prescribedMedications}
                </p>
              )}
              {d.followUpPlan && (
                <p className="text-xs text-[#2c2e4b]/40">Follow-up: {d.followUpPlan}</p>
              )}
            </div>
          ))
        )}
        {medicalRecords[0]?.treatmentPlan && (
          <p className="text-xs text-[#2c2e4b]/80 pt-2 border-t border-[#e7d6bf]/30">
            <span className="font-semibold text-[#2c2e4b]">Treatment Plan:</span> {medicalRecords[0]!.treatmentPlan}
          </p>
        )}
        {medicalRecords[0]?.labRequest && (
          <p className="text-xs text-[#2c2e4b]/80">
            <span className="font-semibold text-[#2c2e4b]">Lab Request:</span> {medicalRecords[0]!.labRequest}
          </p>
        )}
        {medicalRecords[0]?.notes && (
          <p className="text-xs text-[#2c2e4b]/70 mt-1 pt-2 border-t border-[#e7d6bf]/30">
            <span className="font-semibold text-[#2c2e4b]">Notes:</span> {medicalRecords[0]!.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── VisitInfoBar ──────────────────────────────────────────────────

interface VisitInfoBarProps {
  patientName: string;
  fileNumber?: string | null;
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
  fileNumber,
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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
      
      {/* Left section: back button + title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-7 px-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg gap-1 shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium">Profile</span>
        </Button>

        <span className="text-white/20 text-sm select-none">/</span>

        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{patientName}</h1>
          {fileNumber && (
            <span className="text-[9px] font-mono text-white/40 border border-white/15 bg-white/5 rounded px-1.5 py-0.5">
              Chart #{fileNumber}
            </span>
          )}
          <Badge
            variant="outline"
            className={cn('text-[9px] font-bold py-0 h-5 border rounded-md px-1.5', sc.bg, sc.text)}
          >
            {sc.label}
          </Badge>
        </div>
      </div>

      {/* Right section: metadata timeline details */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/40 sm:self-end md:self-auto font-medium">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-white/30" />
          {format(new Date(date), 'EEE, MMM d, yyyy')}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-white/30" />
          {time}
        </span>
        <span className="capitalize px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">{type.toLowerCase()}</span>
        {doctorName && (
          <span className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-white/30" />
            {/^dr\.?\s/i.test(doctorName.trim()) ? doctorName.trim() : `Dr. ${doctorName.trim()}`}
          </span>
        )}
        {durationMinutes != null && (
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">{durationMinutes} min</span>
        )}
      </div>
    </div>
  );
}

// ─── AppointmentNoteStrip ─────────────────────────────────────────

function AppointmentNoteStrip({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <StickyNote className="h-4 w-4 text-[#caa26a] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">
          Appointment Note
        </p>
        <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap mt-0.5">{note}</p>
      </div>
    </div>
  );
}

// ─── BillingSection ───────────────────────────────────────────────

function BillingSection({ billing }: { billing: VisitBilling }) {
  const balance = billing.totalAmount - billing.amountPaid;
  return (
    <Card className="border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-bold text-[#2c2e4b] flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="space-y-2 text-sm">
          {billing.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs py-1.5 border-b border-[#e7d6bf]/30 last:border-0"
            >
              <span className="text-[#2c2e4b]/60">
                {item.serviceName} × {item.quantity}
              </span>
              <span className="font-semibold text-[#2c2e4b]">
                KES {item.totalCost.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-[#e7d6bf] mt-2">
            <span className="text-xs font-semibold text-[#2c2e4b]/80">Total Amount</span>
            <span className="text-sm font-bold text-[#2c2e4b]">
              KES {billing.totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#2c2e4b]/40 font-semibold uppercase tracking-wider mt-1">
            <span>Paid: KES {billing.amountPaid.toLocaleString()}</span>
            <span className="capitalize">{billing.status.toLowerCase()}</span>
          </div>
          {balance > 0 && (
            <p className="text-[10px] text-amber-600 font-semibold pt-1">
              Balance Due: KES {balance.toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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
  } = useVisitDetail(patientId, visitId, enabled);

  const { data: patient } = useVisitPatient(patientId, enabled);

  // ── Auth guard ─────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2c2e4b]">
        <div className="text-center animate-in fade-in">
          <Skeleton className="h-10 w-10 rounded-full mx-auto bg-white/10" />
          <p className="text-sm text-white/40 mt-3">Checking authentication…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2c2e4b]">
        <div className="text-center space-y-3 animate-in fade-in">
          <p className="text-sm text-white/60">Please log in to view visit details</p>
          <Button onClick={() => router.push('/login')} className="bg-[#caa26a] hover:bg-[#caa26a]/90 text-white rounded-lg">Go to Login</Button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-300">
        <PageSkeleton />
      </div>
    );
  }

  // ── Not found / error ───────────────────────────────────────────

  if (error || !visit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <FileText className="h-5 w-5 text-white/30" />
        </div>
        <p className="text-sm font-medium text-white/80">
          {error instanceof Error ? error.message : 'Visit not found'}
        </p>
        <p className="text-xs text-white/40 mt-1">
          This visit may not belong to you or no longer exists.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg"
          onClick={() => router.push(`/doctor/patients/${patientId}`)}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Patient Profile
        </Button>
      </div>
    );
  }

  // ── Rendered ────────────────────────────────────────────────────

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`.trim()
    : 'Patient';
  const hasBilling = Boolean(visit.billing);

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-300 pb-10">
      {/* ── Header ───────────────────────────────────────────────── */}
      <VisitInfoBar
        patientName={patientName}
        fileNumber={patient?.fileNumber}
        doctorName={visit.doctor?.name || null}
        date={visit.date}
        time={visit.time}
        type={visit.type}
        status={visit.status}
        durationMinutes={visit.consultationDuration}
        onBack={() => router.push(`/doctor/patients/${patientId}`)}
      />

      {/* Appointment-level metadata — distinct from clinical notes */}
      {visit.note && <AppointmentNoteStrip note={visit.note} />}

      {/* ── Clinical Documentation (SOAP)  ← PRIMARY CONTENT ─────── */}
      <ConsultationDocumentViewer
        consultation={visit.consultation}
        appointmentDate={visit.date}
        appointmentTime={visit.time}
        appointmentType={visit.type}
      />

      {/* ── Objective: Vitals ────────────────────────────────────── */}
      <VitalsSection vitals={visit.vitals} />

      {/* ── Diagnoses & Prescriptions ────────────────────────────── */}
      <DiagnosesSection medicalRecords={visit.medicalRecords} />

      {/* ── Billing ──────────────────────────────────────────────── */}
      {hasBilling && <BillingSection billing={visit.billing!} />}
    </div>
  );
}
