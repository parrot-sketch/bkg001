/**
 * Shared Hooks for Cross-Module Entities
 * 
 * These hooks are used by both frontdesk and doctor modules to fetch shared data.
 * Using shared hooks ensures cache is shared between modules, reducing duplicate fetches.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import { 
  getSharedPatients, 
  getSharedAppointments, 
  getSharedSurgicalCases,
  type SharedPatientFilters,
  type SharedAppointmentFilters,
  type SharedSurgicalCaseFilters,
} from '@/actions/shared/entities';

const STALE_TIME_MS = 30_000;
const GC_TIME_MS = 5 * 60 * 1000;

export interface UseSharedPatientsOptions extends SharedPatientFilters {
  enabled?: boolean;
}

export function useSharedPatients(options: UseSharedPatientsOptions = {}) {
  const { page = 1, limit = 12, search, enabled = true } = options;
  
  return useQuery({
    queryKey: queryKeys.shared.patients({ page, limit, search }),
    queryFn: () => getSharedPatients({ page, limit, search }),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled,
  });
}

export interface UseSharedAppointmentsOptions extends SharedAppointmentFilters {
  enabled?: boolean;
}

export function useSharedAppointments(options: UseSharedAppointmentsOptions = {}) {
  const { date, status, patientId, enabled = true } = options;
  
  return useQuery({
    queryKey: queryKeys.shared.appointments({ date, status }),
    queryFn: () => getSharedAppointments({ date, status, patientId }),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled,
  });
}

export interface UseSharedSurgicalCasesOptions extends SharedSurgicalCaseFilters {
  enabled?: boolean;
}

export function useSharedSurgicalCases(options: UseSharedSurgicalCasesOptions = {}) {
  const { status, surgeonId, page = 1, limit = 20, enabled = true } = options;
  
  return useQuery({
    queryKey: queryKeys.shared.surgicalCases({ status, surgeonId }),
    queryFn: () => getSharedSurgicalCases({ status, surgeonId, page, limit }),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled,
  });
}