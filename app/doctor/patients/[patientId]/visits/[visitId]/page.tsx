'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import type { VisitResponseDto, VisitConsultation } from '@/application/dtos/VisitResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { parseLegacyNotes } from '@/shared-kernel/utils/note-serialization';

interface PageParams {
  patientId: string;
  visitId: string;
}

const NOTE_SECTIONS = [
  { key: 'chiefComplaint', label: 'Medical History' },
  { key: 'examination', label: 'Physical Examination' },
  { key: 'assessment', label: 'Diagnosis' },
  { key: 'plan', label: 'Plan' },
] as const;

function useVisitDetail(patientId: string, visitId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['doctor', 'patient', patientId, 'visit', visitId] as const,
    queryFn: async () => {
      const res = await apiClient.get<VisitResponseDto[]>(`/patients/${patientId}/visits`);
      if (!res.success) throw new Error(res.error || 'Failed to load visit');
      const visits = (res.data ?? []) as VisitResponseDto[];
      const match = visits.find((visit) => visit.id === visitId);
      if (!match) throw new Error('Visit not found');
      return match;
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled,
  });
}

function useVisitPatient(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['doctor', 'patient', patientId] as const,
    queryFn: async () => {
      const res = await apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
      if (!res.success) throw new Error(res.error || 'Failed to load patient');
      return res.data as PatientResponseDto;
    },
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}

function hasText(value?: string | null) {
  if (!value) return false;
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length > 0;
}

function prettyStatus(status: string) {
  return status.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function sectionContent(consultation: VisitConsultation | null) {
  const recorded = {
    chiefComplaint: consultation?.chiefComplaint,
    examination: consultation?.examination,
    assessment: consultation?.assessment,
    plan: consultation?.plan,
  };
  if (Object.values(recorded).some((value) => hasText(value))) return recorded;
  if (!hasText(consultation?.doctorNotes)) return recorded;
  const parsed = parseLegacyNotes(consultation?.doctorNotes ?? '');
  return {
    chiefComplaint: parsed.chiefComplaint?.replace(/^(?:\s|<\/[^>]+>)+/, ''),
    examination: parsed.examination?.replace(/^(?:\s|<\/[^>]+>)+/, ''),
    assessment: parsed.assessment?.replace(/^(?:\s|<\/[^>]+>)+/, ''),
    plan: parsed.plan?.replace(/^(?:\s|<\/[^>]+>)+/, ''),
  };
}

function NoteBody({ html }: { html?: string | null }) {
  if (!hasText(html)) {
    return <p className="text-sm text-[#2c2e4b]/45">Not recorded</p>;
  }
  return (
    <div
      className="prose prose-sm max-w-none text-sm leading-relaxed text-[#2c2e4b] [&_p]:my-1"
      dangerouslySetInnerHTML={{ __html: html! }}
    />
  );
}

export default function DoctorVisitDetailPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.patientId;
  const visitId = parseInt(resolvedParams.visitId, 10);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const enabled = isAuthenticated && !!patientId && !Number.isNaN(visitId);

  const { data: visit, isLoading, error } = useVisitDetail(patientId, visitId, enabled);
  const { data: patient } = useVisitPatient(patientId, enabled);

  const back = () => router.push(`/doctor/patients/${patientId}?tab=consultations`);

  if (authLoading || (enabled && isLoading)) {
    return <div className="bg-white px-6 py-10 text-sm text-[#2c2e4b]/60">Loading the consultation note…</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-white px-6 py-10">
        <p className="text-sm text-[#2c2e4b]">Please log in to view this consultation.</p>
        <button type="button" onClick={() => router.push('/login')} className="mt-3 text-sm font-medium text-[#005f73] hover:underline">
          Go to login
        </button>
      </div>
    );
  }

  if (Number.isNaN(visitId) || error || !visit) {
    return (
      <div className="bg-white px-6 py-10 text-[#2c2e4b]">
        <button type="button" onClick={back} className="inline-flex items-center text-sm font-medium hover:underline">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Previous consultations
        </button>
        <p className="mt-6 text-lg font-semibold">Unable to load this consultation</p>
        <p className="mt-1 text-sm text-[#2c2e4b]/60">
          {error instanceof Error ? error.message : 'This visit could not be opened.'}
        </p>
      </div>
    );
  }

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
  const visitDate = (() => {
    const parsed = parseISO(visit.date);
    return Number.isNaN(parsed.getTime()) ? visit.date : format(parsed, 'd MMM yyyy');
  })();
  const clinician = visit.doctor?.name
    ? (/^dr\.?\s/i.test(visit.doctor.name.trim()) ? visit.doctor.name.trim() : `Dr. ${visit.doctor.name.trim()}`)
    : '—';
  const content = sectionContent(visit.consultation);
  const sections = NOTE_SECTIONS.map((section) => ({
    ...section,
    html: content[section.key] ?? null,
  }));

  const facts = [
    ['Patient', patientName],
    ['File', patient?.fileNumber || '—'],
    ['Date', [visitDate, visit.time].filter(Boolean).join(' · ')],
    ['Clinician', clinician],
    ['Visit', visit.type || 'Consultation'],
    ['Status', prettyStatus(visit.status)],
  ];

  return (
    <article className="bg-white text-[#2c2e4b]">
      <header className="border-b border-[#e7d6bf] px-4 py-5 sm:px-8">
        <button type="button" onClick={back} className="inline-flex items-center text-sm font-medium text-[#005f73] hover:underline">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Previous consultations
        </button>
        <div className="mt-5 flex items-center gap-4">
          <img
            src="/logo.png"
            alt="Nairobi Sculpt Aesthetic Centre"
            className="h-16 w-auto shrink-0 object-contain sm:h-20"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#003b53]">Nairobi Sculpt</p>
            <p className="text-sm text-[#ee9b00]">Aesthetic Centre</p>
            <h1 className="mt-1 text-lg font-semibold">Consultation note</h1>
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px bg-[#e7d6bf] sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-[#e7d6bf]/30 px-4 py-3 sm:px-6">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {sections.map((section) => (
        <section key={section.key} className="border-b border-[#e7d6bf]">
          <h2 className="border-b border-[#2c2e4b] bg-[#e7d6bf]/30 px-4 py-3 text-sm font-semibold sm:px-8">
            {section.label}
          </h2>
          <div className="px-4 py-4 sm:px-8">
            <NoteBody html={section.html} />
          </div>
        </section>
      ))}
    </article>
  );
}
