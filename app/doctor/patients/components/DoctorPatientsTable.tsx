'use client';

import { PatientRow } from './PatientRow';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface DoctorPatientsTableProps {
  patients: PatientResponseDto[];
  isLoading: boolean;
  onNewConsultation: (patientId: string) => void;
}

export function DoctorPatientsTable({
  patients,
  isLoading,
  onNewConsultation,
}: DoctorPatientsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white border border-[#e7d6bf] rounded-lg">
            <div className="h-9 w-9 rounded-lg bg-[#e7d6bf]/30 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-44 bg-[#e7d6bf]/30 rounded animate-pulse" />
              <div className="h-3 w-28 bg-[#e7d6bf]/30 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-[#e7d6bf]/30 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf] rounded-xl">
        <h3 className="text-sm font-semibold text-[#2c2e4b]">No patients on record</h3>
        <p className="text-xs text-[#2c2e4b]/70 max-w-xs text-center mt-1">
          Patients appear here once assigned to your active care.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#e7d6bf] bg-white overflow-hidden rounded-xl">
      {/* Column headers */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/70 border-b border-[#e7d6bf]">
        <div className="col-span-4">Patient</div>
        <div className="col-span-2">File</div>
        <div className="col-span-2">Phone</div>
        <div className="col-span-2">Last visit</div>
        <div className="col-span-1">Visits</div>
        <div className="col-span-1">Flags</div>
        <div className="col-span-1">Actions</div>
      </div>

      <div className="divide-y divide-[#e7d6bf]">
        {patients.map((patient) => (
          <PatientRow
            key={patient.id}
            patient={patient}
            onNewConsultation={onNewConsultation}
          />
        ))}
      </div>
    </div>
  );
}
