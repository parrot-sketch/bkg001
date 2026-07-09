'use client';

/**
 * DoctorPatientProfilePage — Redesigned
 *
 * Patient detail view for doctors. All data is scoped to the authenticated
 * doctor at the API layer: visits only show this doctor's own appointments;
 * case plans are filtered by doctor_id; consultations are filtered by userId.
 *
 * Uses TanStack Query for all data fetching — no manual useState/useEffect.
 * Skeleton loaders replace the previous full-page spinner.
 *
 * This page is formatted as a structured, single-column clinical medical record chart.
 */

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { doctorApi } from '@/lib/api/doctor';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

// Components
import { PatientProfileHeader } from './components/PatientProfileHeader';
import { ClinicalPatientBanner } from './components/ClinicalPatientBanner';
import { ClinicalDocumentTimeline } from './components/ClinicalDocumentTimeline';

// DTOs
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';

// Helpers / Skeletons
import {
  PatientHeaderSkeleton,
  VisitSkeleton,
  PageError,
} from '@/components/patients/patient-page-extras';

// ─── Query Keys ───────────────────────────────────────────────────
const qkPatient  = (patientId: string) => ['doctor', 'patient', patientId] as const;
const qkVisits   = (patientId: string) => ['doctor', 'patient', patientId, 'visits'] as const;

// ─── Data hooks ───────────────────────────────────────────────────
function usePatientDetail(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: qkPatient(patientId),
    queryFn: async () => {
      const res = await apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
      if (!res.success) throw new Error((res as any).error || 'Failed to load patient');
      return res.data as PatientResponseDto;
    },
    staleTime:  30_000,
    gcTime:     60_000,
    retry:      2,
    refetchOnWindowFocus: false,
    enabled,
  });
}

function usePatientVisits(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: qkVisits(patientId),
    queryFn: async () => {
      const res = await doctorApi.getPatientVisits(patientId);
      if (!res.success) throw new Error(res.error || 'Failed to load visit history');
      return (res as any).data as VisitResponseDto[];
    },
    staleTime:  30_000,
    gcTime:     60_000,
    retry:      2,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export default function DoctorPatientProfilePage() {
  const params   = useParams();
  const router   = useRouter();
  const search   = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  const fromConsultation           = search.get('from') === 'consultation';
  const consultationAppointmentId  = search.get('appointmentId');

  const queryEnabled = !!user && isAuthenticated && !!patientId;

  const { data: patient,  isLoading: patientLoading,  error: patientError,  refetch: refetchPatient  } =
    usePatientDetail(patientId, queryEnabled);

  const { data: visits,   isLoading: visitsLoading,   error: visitsError,   refetch: refetchVisits    } =
    usePatientVisits(patientId, queryEnabled);

  const loading  = patientLoading || visitsLoading;
  const hasError = Boolean(patientError) || Boolean(visitsError);

  // ── Auth guard ─────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center animate-in fade-in duration-200">
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
          <p className="text-sm text-slate-400 mt-3">Checking authentication…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center animate-in fade-in duration-200">
          <p className="text-sm text-slate-400">Please log in to view patient profile</p>
          <Button className="mt-4" onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (loading || !patient) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-8 animate-in fade-in duration-300">
        <PatientHeaderSkeleton />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <VisitSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (hasError) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-300 space-y-6">
        <PatientProfileHeader
          patientName={`${patient.firstName} ${patient.lastName}`}
          fromConsultation={fromConsultation}
          consultationAppointmentId={consultationAppointmentId}
          onBackToPatients={() => router.push('/doctor/patients')}
        />
        <PageError
          message={patientError instanceof Error ? patientError.message : 'Failed to load patient data'}
          onRetry={() => { refetchPatient(); refetchVisits(); }}
        />
      </div>
    );
  }

  const patientName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Row */}
      <PatientProfileHeader
        patientName={patientName}
        fileNumber={patient.fileNumber}
        email={patient.email}
        phone={patient.phone}
        whatsappPhone={patient.whatsappPhone || undefined}
        fromConsultation={fromConsultation}
        consultationAppointmentId={consultationAppointmentId}
        onBackToPatients={() => router.push('/doctor/patients')}
      />

      {/* 1. Demographics & Alerts Banner */}
      <ClinicalPatientBanner patient={patient} />

      {/* 2. Chronic Medical History & Conditions */}
      {(patient.medicalHistory || patient.medicalConditions) && (
        <div className="border border-[#e7d6bf] bg-white p-6 space-y-4 shadow-sm rounded-xl">
          <h2 className="text-xs font-bold text-[#2c2e4b] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#e7d6bf]/50 pb-2">
            <FileText className="h-4 w-4 text-[#2c2e4b]/60" />
            Chronic Medical History & Conditions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#2c2e4b]/80">
            {patient.medicalHistory && (
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">Medical History Summary</span>
                <p className="whitespace-pre-wrap leading-relaxed">{patient.medicalHistory}</p>
              </div>
            )}
            {patient.medicalConditions && (
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">Active Medical Conditions</span>
                <p className="whitespace-pre-wrap leading-relaxed">{patient.medicalConditions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Longitudinal Document timeline (Visits & Observation notes) */}
      <div className="border border-[#e7d6bf] bg-white p-6 shadow-sm rounded-xl">
        <ClinicalDocumentTimeline patientId={patientId} visits={visits || []} />
      </div>
    </div>
  );
}
