'use client';

import { useMemo } from 'react';
import { isThisMonth } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { ActiveStatCardType } from '../components/Stats/PatientStats';

export interface DoctorPatientsFilteredResult {
  filteredPatients: PatientResponseDto[];
}

export function useDoctorPatientsFiltered(
  patients: PatientResponseDto[],
  allergiesOnly: boolean,
  activeStatCard: ActiveStatCardType
): DoctorPatientsFilteredResult {
  return useMemo(() => {
    let list = [...patients];

    if (activeStatCard === 'new') {
      list = list.filter((p) => p.assignedAt && isThisMonth(new Date(p.assignedAt)));
    } else if (allergiesOnly || activeStatCard === 'allergies') {
      list = list.filter((p) => p.allergies?.trim());
    } else if (activeStatCard === 'conditions') {
      list = list.filter((p) => p.medicalConditions?.trim());
    }

    return { filteredPatients: list };
  }, [patients, allergiesOnly, activeStatCard]);
}
