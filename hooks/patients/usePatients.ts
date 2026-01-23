/**
 * usePatients Hooks
 * 
 * React Query hooks for fetching patient data.
 * 
 * REFACTORED FROM: Manual useState/useEffect fetch patterns across multiple pages
 * REASON: Eliminates duplicated fetch logic, provides automatic caching,
 * retries, deduplication, and error handling.
 * 
 * Caching Strategy:
 * - Admin patient list: 2 minutes staleTime (moderate freshness for admin workflows)
 * - Patient detail: 1 minute staleTime (patient data changes infrequently)
 * - Automatic background refetch on window focus
 */

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { patientApi } from '@/lib/api/patient';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

/**
 * Hook for fetching all patients (admin view)
 * 
 * Used by: Admin patients page
 * 
 * @param enabled - Whether the query should run (default: true)
 */
export function useAllPatients(enabled = true) {
  return useQuery({
    queryKey: ['patients', 'all'],
    queryFn: async () => {
      const response = await adminApi.getAllPatients();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load patients');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - moderate freshness for admin workflows
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled,
  });
}

/**
 * Hook for fetching a single patient by ID
 * 
 * Used by: Patient detail pages, profile pages
 * 
 * @param patientId - Patient ID
 * @param enabled - Whether the query should run (default: true)
 */
export function usePatient(patientId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['patients', patientId],
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }
      const response = await patientApi.getPatient(patientId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load patient');
      }
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute - patient data changes infrequently
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook for fetching patient's appointments
 * 
 * Used by: Patient dashboard, patient appointments page
 * 
 * @param patientId - Patient ID
 * @param enabled - Whether the query should run (default: true)
 */
export function usePatientAppointments(patientId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['patients', patientId, 'appointments'],
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }
      const response = await patientApi.getAppointments(patientId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load appointments');
      }
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook for fetching patient's upcoming appointments
 * 
 * Used by: Patient dashboard
 * 
 * @param patientId - Patient ID
 * @param enabled - Whether the query should run (default: true)
 */
export function usePatientUpcomingAppointments(patientId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['patients', patientId, 'appointments', 'upcoming'],
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }
      const response = await patientApi.getUpcomingAppointments(patientId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load upcoming appointments');
      }
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled: enabled && !!patientId,
  });
}
