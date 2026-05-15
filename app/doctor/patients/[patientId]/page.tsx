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
 * Consultation notes are rendered by ConsultationDocumentViewer (plain text,
 * no HTML) and are shown inline inside each visit card.
 */

import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { doctorApi } from '@/lib/api/doctor';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  FileText,
  Activity,
  Thermometer,
  Pill,
  DollarSign,
  NotebookPen,
} from 'lucide-react';

// Components
import { PatientProfileHeader } from './components/PatientProfileHeader';
import { PatientInfoSidebar } from './components/PatientInfoSidebar';
import { ClinicalNotesTab } from './components/ClinicalNotesTab';
import { ConsultationDocumentViewer } from '@/components/patients/ConsultationDocumentViewer';

// DTOs
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';

// ─── Extracted components ─────────────────────────────────────────
import {
  PatientHeaderSkeleton,
  SidebarSkeleton,
  VisitSkeleton,
  NotesSkeleton,
  PageError,
  VisitCard,
} from '@/components/patients/patient-page-extras';

// ─── Query Keys ───────────────────────────────────────────────────

const qkPatient  = (patientId: string)        => ['doctor', 'patient', patientId] as const;
const qkVisits   = (patientId: string)        => ['doctor', 'patient', patientId, 'visits'] as const;

// ─── Data hooks ───────────────────────────────────────────────────

function usePatientDetail(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: qkPatient(patientId),
    queryFn: async () => {
      const res = await apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
      if (!res.success) throw new Error((res as any).error || 'Failed to load patient');
      return res.data as PatientResponseDto;
    },
    staleTime:  30_000,     // 30 s — clinic data changes often
    gcTime:     60_000,     // 1 min
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

// ─── Query Keys ───────────────────────────────────────────────────

export default function DoctorPatientProfilePage() {
  const params   = useParams();
  const router   = useRouter();
  const search   = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  const fromConsultation           = search.get('from') === 'consultation';
  const consultationAppointmentId  = search.get('appointmentId');

  // Queries run only after auth check
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
      <div className="space-y-6 animate-in fade-in duration-300">
        <PatientHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SidebarSkeleton />
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <VisitSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────

  if (hasError) {
    return (
      <div className="animate-in fade-in duration-300">
        <PatientProfileHeader
          patientName={`${patient.firstName} ${patient.lastName}`}
          fromConsultation={fromConsultation}
          consultationAppointmentId={consultationAppointmentId}
          onBackToPatients={() => router.push('/doctor/patients')}
        />
        <div className="mt-6">
          <PageError
            message={patientError instanceof Error ? patientError.message : 'Failed to load patient data'}
            onRetry={() => { refetchPatient(); refetchVisits(); }}
          />
        </div>
      </div>
    );
  }

  // ── Derived ────────────────────────────────────────────────────

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const upcomingVisits = visits
    ? visits.filter((v) => {
        const d = new Date(v.date); d.setHours(0, 0, 0, 0);
        return d >= new Date(new Date().setHours(0, 0, 0, 0));
      })
    : [];

  // ── Rendered ───────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <PatientProfileHeader
        patientName={patientName}
        fromConsultation={fromConsultation}
        consultationAppointmentId={consultationAppointmentId}
        onBackToPatients={() => router.push('/doctor/patients')}
      />

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* ── Left: Patient Info ───────────────────────────────── */}
        <PatientInfoSidebar
          patient={patient}
          visitCount={visits?.length ?? 0}
          upcomingCount={upcomingVisits.length}
        />

        {/* ── Right: Visit History + Notes ────────────────────── */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="visits" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="visits" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Visit History
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5">
                <NotebookPen className="h-3.5 w-3.5" /> Clinical Notes
              </TabsTrigger>
            </TabsList>

            {/* ── Visits Tab ─────────────────────────────────────── */}
            <TabsContent value="visits" className="space-y-3 mt-0">
              {visits && visits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-stone-200">
                  <Calendar className="h-7 w-7 text-stone-300 mb-3" />
                  <p className="text-sm font-medium text-stone-600">No visits recorded</p>
                  <p className="text-xs text-stone-400 mt-1">Visit history will appear after appointments.</p>
                </div>
              ) : (
                visits?.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} patientId={patientId} />
                ))
              )}
            </TabsContent>

            {/* ── Notes Tab ─────────────────────────────────────── */}
            <TabsContent value="notes" className="mt-0" forceMount>
              {/* The Notes tab is a server component placeholder — the actual
                  clinical-note editor/list is managed by the NotesContext via
                  the floating +FAB entry point when the doctor is in consultation. */}
              <ClinicalNotesTab patientId={patientId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
