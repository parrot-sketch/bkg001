'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface DoctorPatientsTableProps {
  patients: PatientResponseDto[];
  isLoading: boolean;
  isUpdating: boolean;
  hasSearch: boolean;
}

function humanize(value?: string | null) {
  if (!value) return null;
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function identity(patient: PatientResponseDto) {
  const age = typeof patient.age === 'number' ? `${patient.age} yrs` : null;
  return [humanize(patient.gender), age].filter(Boolean).join(' · ');
}

function PatientLine({ patient }: { patient: PatientResponseDto }) {
  const lastVisit = patient.lastVisitDate
    ? format(new Date(patient.lastVisitDate), 'd MMM yyyy')
    : 'No visit yet';
  const allergy = patient.allergies?.trim();

  return (
    <Link
      href={`/doctor/patients/${patient.id}`}
      className="grid grid-cols-1 gap-1 border-b border-[#e7d6bf] px-4 py-4 active:bg-[#e7d6bf]/40 sm:grid-cols-[minmax(0,1.5fr)_7.5rem_9.5rem_8rem] sm:items-center sm:gap-4 sm:px-6"
    >
      <div className="min-w-0">
        <div className="truncate text-base font-medium">{patient.firstName} {patient.lastName}</div>
        <div className="mt-0.5 truncate text-sm text-[#2c2e4b]/60">{identity(patient) || '—'}</div>
        {allergy && (
          <div className="mt-1 truncate text-sm text-[#9b2226]">Allergy: {allergy}</div>
        )}
      </div>
      <div className="text-sm sm:text-[#2c2e4b]">
        <span className="text-[#2c2e4b]/50 sm:hidden">File </span>
        {patient.fileNumber || '—'}
      </div>
      <div className="text-sm">
        <span className="text-[#2c2e4b]/50 sm:hidden">Phone </span>
        {patient.phone || '—'}
      </div>
      <div className="text-sm text-[#2c2e4b]/80">
        <span className="text-[#2c2e4b]/50 sm:hidden">Last visit </span>
        {lastVisit}
      </div>
    </Link>
  );
}

export function DoctorPatientsTable({
  patients,
  isLoading,
  isUpdating,
  hasSearch,
}: DoctorPatientsTableProps) {
  if (isLoading) {
    return (
      <div>
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} className="border-b border-[#e7d6bf] px-4 py-4 sm:px-6">
            <div className="h-4 w-40 animate-pulse bg-[#e7d6bf]/50" />
            <div className="mt-2 h-3 w-24 animate-pulse bg-[#e7d6bf]/40" />
          </div>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-semibold">
          {hasSearch ? 'No patients match that search' : 'No patients on your list'}
        </p>
        <p className="mt-1 text-sm text-[#2c2e4b]/60">
          {hasSearch
            ? 'Try the file number or part of the name.'
            : 'Patients appear here once they are assigned to you.'}
        </p>
      </div>
    );
  }

  return (
    <div className={isUpdating ? 'opacity-60' : undefined}>
      <div className="hidden border-b border-[#2c2e4b] bg-[#e7d6bf]/30 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-[#2c2e4b]/70 sm:grid sm:grid-cols-[minmax(0,1.5fr)_7.5rem_9.5rem_8rem] sm:gap-4">
        <div>Patient</div>
        <div>File</div>
        <div>Phone</div>
        <div>Last visit</div>
      </div>
      {patients.map((patient) => (
        <PatientLine key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
