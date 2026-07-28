'use client';


import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { doctorApi } from '@/lib/api/doctor';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Stethoscope, CalendarDays, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  // ── Financial summary ───────────────────────────────────────
  const financialSummary = useMemo(() => {
    if (!visits) return { totalBilled: 0, totalPaid: 0, totalDiscount: 0, outstanding: 0, unpaidCount: 0 };
    let totalBilled = 0;
    let totalPaid = 0;
    let totalDiscount = 0;
    let outstanding = 0;
    let unpaidCount = 0;
    for (const v of visits) {
      if (v.billing) {
        totalBilled += v.billing.totalAmount;
        totalPaid += v.billing.amountPaid;
        totalDiscount += v.billing.discount;
        const visitBalance = v.billing.totalAmount - v.billing.amountPaid - v.billing.discount;
        if (visitBalance > 0) {
          outstanding += visitBalance;
          unpaidCount++;
        }
      }
    }
    return { totalBilled, totalPaid, totalDiscount, outstanding, unpaidCount };
  }, [visits]);

  const [isStartingConsultation, setIsStartingConsultation] = useState(false);

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

      {/* 2. Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 px-4 flex items-center gap-3 border-[#e7d6bf] hover:bg-[#e7d6bf]/10 rounded-xl"
          onClick={async () => {
            setIsStartingConsultation(true);
            try {
              const result = await apiClient.post(`/doctor/patients/${patientId}/start-consultation`, {});
              const appointmentId = (result as any).appointmentId ?? (result as any).data?.id;
              if (result.success && appointmentId) {
                toast.success('Consultation started');
                router.push(`/doctor/consultations/session/${appointmentId}`);
              } else {
                toast.error((result as any).error || 'Failed to start consultation');
              }
            } catch {
              toast.error('Failed to start consultation');
            } finally {
              setIsStartingConsultation(false);
            }
          }}
          disabled={isStartingConsultation}
        >
          {isStartingConsultation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-[#2c2e4b] text-white flex items-center justify-center shrink-0">
              <Stethoscope className="h-4 w-4" />
            </div>
          )}
          <div className="text-left">
            <div className="text-xs font-semibold text-[#2c2e4b]">New Consultation</div>
            <div className="text-[10px] text-[#2c2e4b]/50">Start a new visit</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-3 px-4 flex items-center gap-3 border-[#e7d6bf] hover:bg-[#e7d6bf]/10 rounded-xl"
          onClick={() => router.push(`/doctor/appointments/new?patientId=${patientId}&source=DOCTOR_FOLLOW_UP`)}
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-[#2c2e4b]">Schedule Follow-up</div>
            <div className="text-[10px] text-[#2c2e4b]/50">Book next appointment</div>
          </div>
        </Button>
      </div>

      {/* 3. Financial Summary */}
      {(financialSummary.outstanding > 0 || financialSummary.totalBilled > 0) && (
        <div className="border border-[#e7d6bf] bg-white p-5 rounded-xl shadow-sm">
          <h2 className="text-xs font-bold text-[#2c2e4b] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#e7d6bf]/50 pb-2 mb-4">
            <CreditCard className="h-4 w-4 text-[#2c2e4b]/60" />
            Financial Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">Total Billed</span>
              <span className="text-sm font-semibold text-[#2c2e4b]">
                KSh {financialSummary.totalBilled.toLocaleString()}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">Total Paid</span>
              <span className="text-sm font-semibold text-emerald-700">
                KSh {financialSummary.totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">Discounts</span>
              <span className="text-sm font-semibold text-[#2c2e4b]">
                KSh {financialSummary.totalDiscount.toLocaleString()}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">Outstanding</span>
              <span className={cn('text-sm font-bold', financialSummary.outstanding > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                KSh {financialSummary.outstanding.toLocaleString()}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">Unpaid Bills</span>
              <span className="text-sm font-semibold text-[#2c2e4b]">
                {financialSummary.unpaidCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Chronic Medical History & Conditions */}
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

      {/* 5. Longitudinal Document timeline (Visits & Consultation notes) */}
      <div className="border border-[#e7d6bf] bg-white p-6 shadow-sm rounded-xl">
        <ClinicalDocumentTimeline patientId={patientId} visits={visits || []} />
      </div>
    </div>
  );
}
