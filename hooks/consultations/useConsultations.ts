/**
 * Consultation Request Hooks
 * 
 * React Query hooks for fetching consultations data with consistent caching
 * and error handling across the frontdesk module.
 */

import { useQuery } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { CONSULTATION_CONFIG } from '@/lib/constants/frontdesk';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

/**
 * Hook for fetching pending consultation requests
 * 
 * Returns consultation requests in SUBMITTED or PENDING_REVIEW status
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
      return response.data || [];
    },
    staleTime: CONSULTATION_CONFIG.CACHE_STALE_TIME_MS,
    gcTime: CONSULTATION_CONFIG.CACHE_GARBAGE_COLLECTION_MS,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled,
  });
}

/**
 * Hook for fetching consultations by status
 * 
 * Used by: Frontdesk consultations page, dashboard
 * 
 * @param statuses - Array of consultation request statuses to filter by
 * @param enabled - Whether the query should run (default: true)
 */
export function useConsultationsByStatus(statuses: string[], enabled = true) {
  return useQuery({
    queryKey: ['consultations', 'status', statuses.join(',')],
    queryFn: async () => {
      const response = await frontdeskApi.getConsultationsByStatus(statuses);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load consultations');
      }
      return response.data || [];
    },
    staleTime: CONSULTATION_CONFIG.CACHE_STALE_TIME_MS,
    gcTime: CONSULTATION_CONFIG.CACHE_GARBAGE_COLLECTION_MS,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: enabled && statuses.length > 0,
  });
}
