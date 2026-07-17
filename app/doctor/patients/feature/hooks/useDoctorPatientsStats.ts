'use client';

import { useMemo } from 'react';
import { isThisMonth } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

export interface DoctorPatientsStats {
  total: number;
  newThisMonth: number;
  withAllergies: number;
  withConditions: number;
}

export function useDoctorPatientsStats(
  patients: PatientResponseDto[],
  total: number
): DoctorPatientsStats {
  return useMemo(() => {
    const newThisMonth = patients.filter(
      (p) => p.assignedAt && isThisMonth(new Date(p.assignedAt))
    ).length;
    const withAllergies = patients.filter((p) => p.allergies?.trim()).length;
    const withConditions = patients.filter((p) => p.medicalConditions?.trim()).length;
    return { total, newThisMonth, withAllergies, withConditions };
  }, [patients, total]);
}
