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
import { frontdeskApi } from '@/lib/api/frontdesk';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

/**
 * Hook for fetching today's appointments
 * 
 * Used by: Frontdesk dashboard, Nurse dashboard
 * 
 * @param enabled - Whether the query should run (default: true)
 */
export function useTodayAppointments(enabled = true) {
  return useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: async () => {
      const response = await frontdeskApi.getTodayAppointments();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load today\'s appointments');
      }
      return response.data;
    },
    staleTime: 1000 * 30, // 30 seconds - moderate freshness for clinical workflows
    gcTime: 1000 * 60 * 5, // 5 minutes - keep in cache briefly
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refetch on focus for clinical safety
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
    queryKey: ['consultations', 'pending'],
    queryFn: async () => {
      const response = await frontdeskApi.getPendingConsultations();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pending consultations');
      }
      return response.data;
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
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
  return useQuery({
    queryKey: ['appointments', 'date', date.toISOString().split('T')[0]],
    queryFn: async () => {
      const response = await frontdeskApi.getAppointmentsByDate(date);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load appointments');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - appointments don't change frequently
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled,
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
    queryKey: ['appointments', 'upcoming'],
    queryFn: async () => {
      const response = await frontdeskApi.getUpcomingAppointments();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load upcoming appointments');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled,
  });
}
