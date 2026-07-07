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
      className="px-4 py-3 hover:bg-[#e7d6bf]/10 transition-colors cursor-pointer md:grid md:grid-cols-12 md:gap-4 md:items-center"
      onClick={() => router.push(`/doctor/patients/${patient.id}`)}
    >
      <div className="md:col-span-4 min-w-0 flex items-center gap-3">
        <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center text-xs font-semibold text-[#2c2e4b] flex-shrink-0 rounded-lg">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#2c2e4b] truncate">{fullName}</div>
          <div className="text-xs text-[#2c2e4b]/60 md:hidden mt-0.5">
            {patient.fileNumber || '—'} • {patient.phone || '—'} • Last: {lastVisitLabel} • {appointmentCount} visit{appointmentCount !== 1 ? 's' : ''} • {flagsLabel}
          </div>
          <div className="hidden md:block text-xs text-[#2c2e4b]/60 mt-0.5">
            {[patient.gender ? patient.gender.toLowerCase() : null, age !== null ? `${age} yrs` : null].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
      </div>

      <div className="hidden md:block md:col-span-2 text-sm text-[#2c2e4b]">{patient.fileNumber || '—'}</div>
      <div className="hidden md:block md:col-span-2 text-sm text-[#2c2e4b]">{patient.phone || '—'}</div>
      <div className="hidden md:block md:col-span-2 text-sm text-[#2c2e4b]">{lastVisitLabel}</div>
      <div className="hidden md:block md:col-span-1 text-sm text-[#2c2e4b]">{appointmentCount}</div>
      <div className="hidden md:block md:col-span-1 text-xs text-[#2c2e4b]/70 truncate">{flagsLabel}</div>
    </div>
  );
}
