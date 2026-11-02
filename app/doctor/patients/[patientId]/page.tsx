'use client';

import { Suspense, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { doctorApi } from '@/lib/api/doctor';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateAge } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DoctorPatientChart } from './components/DoctorPatientChart';
import { DoctorPatientRecord } from './components/DoctorPatientRecord';
import { DoctorConsultationChargeSheet } from './components/DoctorConsultationChargeSheet';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';

type RecordTab = 'consultations' | 'profile' | 'charges';

function normalizeTab(value: string | null): RecordTab {
  if (value === 'profile' || value === 'record') return 'profile';
  if (value === 'charges' || value === 'account') return 'charges';
  return 'consultations';
}

function usePatientDetail(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['doctor', 'patient', patientId] as const,
    queryFn: async () => {
      const res = await apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
      if (!res.success) throw new Error(res.error || 'Failed to load patient');
      return res.data as PatientResponseDto;
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled,
  });
}

function usePatientVisits(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['doctor', 'patient', patientId, 'visits', 'all'] as const,
    queryFn: async () => {
      const res = await doctorApi.getPatientVisits(patientId, undefined, undefined, 'all');
      if (!res.success) throw new Error(res.error || 'Failed to load visit history');
      return (res.data ?? []) as VisitResponseDto[];
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled,
  });
}

function humanize(value?: string | null) {
  if (!value) return null;
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function DoctorPatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;
  const fromConsultation = search.get('from') === 'consultation';
  const consultationAppointmentId = search.get('appointmentId');
  const tabParam = search.get('tab');
  const [tab, setTab] = useState<RecordTab>(normalizeTab(tabParam));
  const [isStartingConsultation, setIsStartingConsultation] = useState(false);

  const queryEnabled = !!user && isAuthenticated && !!patientId;
  const { data: patient, isLoading: patientLoading, error: patientError, refetch: refetchPatient } =
    usePatientDetail(patientId, queryEnabled);
  const { data: visits = [], isLoading: visitsLoading, error: visitsError, refetch: refetchVisits } =
    usePatientVisits(patientId, queryEnabled);

  const outstanding = useMemo(
    () => visits.reduce((sum, visit) => {
      if (!visit.billing) return sum;
      return sum + Math.max(0, visit.billing.totalAmount - visit.billing.amountPaid - visit.billing.discount);
    }, 0),
    [visits],
  );

  const selectTab = (next: RecordTab) => {
    setTab(next);
    const query = new URLSearchParams(search.toString());
    query.set('tab', next);
    router.replace(`/doctor/patients/${patientId}?${query.toString()}`, { scroll: false });
  };

  const startConsultation = async () => {
    setIsStartingConsultation(true);
    try {
      const result = await apiClient.post(`/doctor/patients/${patientId}/start-consultation`, {});
      const appointmentId = (result as { appointmentId?: number; data?: { id?: number } }).appointmentId
        ?? (result as { data?: { id?: number } }).data?.id;
      if (result.success && appointmentId) {
        toast.success('Consultation started');
        router.push(`/doctor/consultations/session/${appointmentId}`);
      } else {
        toast.error((result as { error?: string }).error || 'Failed to start consultation');
      }
    } catch {
      toast.error('Failed to start consultation');
    } finally {
      setIsStartingConsultation(false);
    }
  };

  if (authLoading || (queryEnabled && patientLoading)) {
    return <div className="bg-white px-6 py-10 text-sm text-[#2c2e4b]/60">Loading the record…</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-white px-6 py-10">
        <p className="text-sm text-[#2c2e4b]">Please log in to view this record.</p>
        <Button className="mt-4 rounded-none" onClick={() => router.push('/login')}>Go to login</Button>
      </div>
    );
  }

  if (patientError || !patient) {
    return (
      <div className="bg-white px-6 py-10 text-[#2c2e4b]">
        <button type="button" onClick={() => router.push('/doctor/patients')} className="inline-flex items-center text-sm font-medium hover:underline">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          My patients
        </button>
        <p className="mt-6 text-lg font-semibold">Unable to load this record</p>
        <p className="mt-1 text-sm text-[#2c2e4b]/60">
          {patientError instanceof Error ? patientError.message : 'The patient record could not be loaded.'}
        </p>
        <button type="button" onClick={() => refetchPatient()} className="mt-3 text-sm font-medium text-[#005f73] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
  const lastVisit = visits[0]?.date ? format(new Date(visits[0].date), 'd MMM yyyy') : patient.lastVisitDate ? format(new Date(patient.lastVisitDate), 'd MMM yyyy') : '—';
  const identity = [humanize(patient.gender), age].filter(Boolean).join(' · ');

  const facts = [
    ['Visits', String(visits.length)],
    ['Last visit', lastVisit],
    ['Blood group', patient.bloodGroup || '—'],
    ['Outstanding', outstanding > 0 ? `KES ${outstanding.toLocaleString('en-KE')}` : 'KES 0'],
  ];

  return (
    <div className="bg-white text-[#2c2e4b]">
      <header className="bg-[#2c2e4b] px-6 py-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-4">
              {fromConsultation && consultationAppointmentId && (
                <button
                  type="button"
                  onClick={() => router.push(`/doctor/consultations/session/${consultationAppointmentId}`)}
                  className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Consultation
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/doctor/patients')}
                className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                My patients
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{patientName}</h1>
              {patient.fileNumber && (
                <span className="border border-white/30 bg-white/10 px-2.5 py-1 font-mono text-xs font-semibold tracking-wide">
                  {patient.fileNumber}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/80">
              {identity}
              {identity && patient.phone ? ' · ' : ''}
              {patient.phone ? <a href={`tel:${patient.phone}`} className="hover:underline">{patient.phone}</a> : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              onClick={startConsultation}
              disabled={isStartingConsultation}
              className="h-9 rounded-none bg-[#caa26a] px-4 font-semibold text-[#2c2e4b] shadow-none hover:bg-[#b8913e]"
            >
              {isStartingConsultation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start consultation
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/doctor/appointments/new?patientId=${patientId}&source=DOCTOR_FOLLOW_UP`)}
              className="h-9 rounded-none border-white/40 bg-transparent px-4 font-medium text-white shadow-none hover:bg-white/10 hover:text-white"
            >
              Schedule follow-up
            </Button>
          </div>
        </div>
      </header>

      {patient.allergies?.trim() && (
        <div className="border-b border-[#9b2226]/25 bg-[#9b2226]/5 px-6 py-3 text-sm text-[#9b2226]">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Allergies</span>
          <p className="mt-0.5 font-medium">{patient.allergies}</p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-px bg-[#e7d6bf] sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-[#e7d6bf]/30 px-5 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">{label}</dt>
            <dd className="mt-1 text-base font-semibold text-[#2c2e4b]">{value}</dd>
          </div>
        ))}
      </dl>

      <div role="tablist" aria-label="Patient record sections" className="flex border-b border-[#e7d6bf]">
        {([
          ['consultations', 'Previous consultations', visits.length],
          ['profile', 'Patient profile', undefined],
          ['charges', 'Charge sheet', undefined],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium',
              tab === id
                ? 'border-[#2c2e4b] bg-[#e7d6bf]/30 text-[#2c2e4b]'
                : 'border-transparent text-[#2c2e4b]/60 hover:bg-[#e7d6bf]/30 hover:text-[#2c2e4b]',
            )}
          >
            {label}
            {typeof count === 'number' && <span className="font-mono text-[11px] text-[#005f73]">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'consultations' && (
        <DoctorPatientChart
          patientId={patientId}
          visits={visits}
          isLoading={visitsLoading}
          error={visitsError instanceof Error ? visitsError.message : null}
          onRetry={() => { void refetchVisits(); }}
        />
      )}
      {tab === 'profile' && <DoctorPatientRecord patient={patient} />}
      {tab === 'charges' && (
        <DoctorConsultationChargeSheet
          visits={visits}
          isLoading={visitsLoading}
          onSaved={() => { void refetchVisits(); }}
        />
      )}
    </div>
  );
}

export default function DoctorPatientProfileRoute() {
  return (
    <Suspense fallback={<div className="bg-white px-6 py-10 text-sm text-[#2c2e4b]">Loading the patient record…</div>}>
      <DoctorPatientProfilePage />
    </Suspense>
  );
}
