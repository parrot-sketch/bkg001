'use client';

import { useState, useCallback } from 'react';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import type { DoctorPatientSortBy, DoctorPatientSortOrder } from '@/hooks/doctor/useDoctorPatients';
import type { UseDoctorPatientsOptions } from '@/hooks/doctor/useDoctorPatients';

export interface DoctorPatientsQueryOptions {
  enabled?: boolean;
}

export interface DoctorPatientsQueryResult {
  patients: ReturnType<typeof useDoctorPatients>['data'] extends { patients: infer P } ? P : never;
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useDoctorPatientsQuery(
  options: DoctorPatientsQueryOptions & UseDoctorPatientsOptions
) {
  const { enabled = true, status, skip, take, search, sortBy, sortOrder } = options;

  const { data, isLoading, isFetching, error, refetch } = useDoctorPatients(enabled, {
    status,
    skip,
    take,
    search,
    sortBy,
    sortOrder,
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;

  return {
    patients,
    total,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
