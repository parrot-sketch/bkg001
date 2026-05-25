'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface PatientRowProps {
  patient: PatientResponseDto;
  appointmentCount: number;
  lastVisit?: Date;
}

export function PatientRow({
  patient,
  appointmentCount,
  lastVisit,
}: PatientRowProps) {
  const router = useRouter();
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  const age = patient.age ?? (patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31557600000) : null);

  const hasAllergies = !!patient.allergies?.trim();
  const hasConditions = !!patient.medicalConditions?.trim();

  const lastVisitLabel = lastVisit ? format(lastVisit, 'MMM d, yyyy') : '—';
  const flags: string[] = [];
  if (hasAllergies) flags.push('Allergies');
  if (hasConditions) flags.push('Conditions');
  if (patient.insuranceProvider) flags.push('Insured');
  const flagsLabel = flags.length ? flags.join(', ') : '—';

  return (
    <div
      className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer md:grid md:grid-cols-12 md:gap-4 md:items-center"
      onClick={() => router.push(`/doctor/patients/${patient.id}`)}
    >
      <div className="md:col-span-4 min-w-0 flex items-center gap-3">
        <div className="h-9 w-9 border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-700 flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{fullName}</div>
          <div className="text-xs text-slate-500 md:hidden mt-0.5">
            {patient.fileNumber || '—'} • {patient.phone || '—'} • Last: {lastVisitLabel} • {appointmentCount} visit{appointmentCount !== 1 ? 's' : ''} • {flagsLabel}
          </div>
          <div className="hidden md:block text-xs text-slate-500 mt-0.5">
            {[patient.gender ? patient.gender.toLowerCase() : null, age !== null ? `${age} yrs` : null].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
      </div>

      <div className="hidden md:block md:col-span-2 text-sm text-slate-700">{patient.fileNumber || '—'}</div>
      <div className="hidden md:block md:col-span-2 text-sm text-slate-700">{patient.phone || '—'}</div>
      <div className="hidden md:block md:col-span-2 text-sm text-slate-700">{lastVisitLabel}</div>
      <div className="hidden md:block md:col-span-1 text-sm text-slate-700">{appointmentCount}</div>
      <div className="hidden md:block md:col-span-1 text-xs text-slate-700 truncate">{flagsLabel}</div>
    </div>
  );
}
