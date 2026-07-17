'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { PatientRow } from './PatientRow';

export interface DoctorPatientsTableProps {
  patients: PatientResponseDto[];
  isFetching: boolean;
  isLoading: boolean;
  onClearFilters: () => void;
}

export function DoctorPatientsTable({
  patients,
  isFetching,
  isLoading,
  onClearFilters,
}: DoctorPatientsTableProps) {
  if (isLoading) {
    return null;
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf] rounded-xl">
        <h3 className="text-sm font-semibold text-[#2c2e4b]">No patients match your filters</h3>
        <p className="text-xs text-[#2c2e4b]/60 max-w-xs text-center mt-1">
          Clear the active filter to see the full page.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
          onClick={onClearFilters}
        >
          Clear filter
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-[#e7d6bf] bg-white overflow-hidden rounded-xl">
      {/* Subtle fetch overlay */}
      {isFetching && !isLoading && (
        <div className="h-0.5 bg-[#caa26a]/40 animate-pulse" />
      )}

      {/* Column headers */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60 border-b border-[#e7d6bf]">
        <div className="col-span-4">Patient</div>
        <div className="col-span-2">File</div>
        <div className="col-span-2">Phone</div>
        <div className="col-span-2">Last visit</div>
        <div className="col-span-1">Visits</div>
        <div className="col-span-1">Flags</div>
      </div>

      <div className="divide-y divide-[#e7d6bf]">
        {patients.map((patient) => (
          <PatientRow key={patient.id} patient={patient} />
        ))}
      </div>
    </div>
  );
}
