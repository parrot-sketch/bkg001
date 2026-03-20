/**
 * useAppointments Hooks
 *
 * React Query hooks for fetching appointments data.
 *
 * REFACTORED FROM: Manual useState/useEffect fetch patterns across multiple pages
 * REASON: Eliminates duplicated fetch logic, provides automatic caching,
 * retries, deduplication, and error handling.
 *
 * Caching Strategy:
 * - Dashboard data: 30 seconds staleTime (moderate freshness for clinical workflows)
 * - Date-specific queries: 2 minutes staleTime (appointments don't change frequently)
 * - Automatic background refetch on window focus for clinical safety
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { queryKeys } from '@/lib/constants/queryKeys';
import { APPOINTMENT_CONFIG } from '@/lib/constants/frontdesk';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

const {
  BY_DATE_STALE_TIME_MS,
  BY_DATE_GC_TIME_MS,
  TODAY_STALE_TIME_MS,
  UPCOMING_STALE_TIME_MS,
} = APPOINTMENT_CONFIG;

/**
 * Hook for fetching today's appointments
 *
 * Used by: Frontdesk dashboard, Nurse dashboard
 *
 * @param enabled - Whether the query should run (default: true)
 */
export function useTodayAppointments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointments.today(),
    queryFn: async (): Promise<AppointmentResponseDto[]> => {
      const response = await frontdeskApi.getTodayAppointments();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load today\'s appointments');
      }
      return response.data;
    },
    staleTime: TODAY_STALE_TIME_MS,
    gcTime: APPOINTMENT_CONFIG.CACHE_GARBAGE_COLLECTION_MS,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled,
  });
}

/**
 * Hook for fetching pending consultation requests
 *
 * Used by: Frontdesk dashboard
 *
 * @param enabled - Whether the query should run (default: true)
 */
export function usePendingConsultations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.consultations.pending(),
    queryFn: async () => {
      const response = await frontdeskApi.getPendingConsultations();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pending consultations');
      }
      return response.data;
    },
    staleTime: APPOINTMENT_CONFIG.CACHE_STALE_TIME_MS,
    gcTime: APPOINTMENT_CONFIG.CACHE_GARBAGE_COLLECTION_MS,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled,
  });
}

/**
 * Hook for fetching appointments by date
 *
 * Used by: Frontdesk appointments page
 *
 * @param date - Date to fetch appointments for
 * @param enabled - Whether the query should run (default: true)
 */
export function useAppointmentsByDate(date: Date, enabled = true) {
  const dateString = date.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: queryKeys.appointments.byDate(dateString),
    queryFn: async (): Promise<AppointmentResponseDto[]> => {
      const response = await frontdeskApi.getAppointmentsByDate(date);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load appointments');
      }
      return response.data;
    },
    staleTime: BY_DATE_STALE_TIME_MS,
    gcTime: BY_DATE_GC_TIME_MS,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Hook for fetching all appointments for a specific patient
 *
 * Used by: Frontdesk patient profile appointments tab
 *
 * @param patientId - The patient's UUID
 * @param enabled   - Whether the query should run (default: true)
 */
export function usePatientAppointments(patientId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointments.byPatient(patientId),
    queryFn: async (): Promise<AppointmentResponseDto[]> => {
      const response = await frontdeskApi.getPatientAppointments(patientId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load patient appointments');
      }
      return response.data ?? [];
    },
    staleTime: BY_DATE_STALE_TIME_MS,
    gcTime: BY_DATE_GC_TIME_MS,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook for fetching upcoming appointments
 *
 * Used by: Various dashboards
 *
 * @param enabled - Whether the query should run (default: true)
 */
export function useUpcomingAppointments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointments.upcoming(),
    queryFn: async (): Promise<AppointmentResponseDto[]> => {
      const response = await frontdeskApi.getUpcomingAppointments();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load upcoming appointments');
      }
      return response.data;
    },
    staleTime: UPCOMING_STALE_TIME_MS,
    gcTime: BY_DATE_GC_TIME_MS,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled,
  });
}
