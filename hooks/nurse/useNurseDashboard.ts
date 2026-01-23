/**
 * useNurseDashboard Hooks
 * 
 * React Query hooks for nurse dashboard data.
 * 
 * REFACTORED FROM: Manual useState/useEffect fetch in app/nurse/dashboard/page.tsx
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 * 
 * Caching Strategy:
 * - Dashboard data: 30 seconds staleTime (moderate freshness for clinical workflows)
 * - Automatic background refetch on window focus for clinical safety
 */

import { useQuery } from '@tanstack/react-query';
import { nurseApi } from '@/lib/api/nurse';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

/**
 * Hook for fetching today's checked-in patients
 * 
 * Used by: Nurse dashboard
 * 
 * @param enabled - Whether the query should run (default: true)
 */
export function useTodayCheckedInPatients(enabled = true) {
  return useQuery({
    queryKey: ['nurse', 'patients', 'checked-in', 'today'],
    queryFn: async () => {
      const response = await nurseApi.getTodayCheckedInPatients();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load checked-in patients');
      }
      return response.data;
    },
    staleTime: 1000 * 30, // 30 seconds - moderate freshness for clinical workflows
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refetch on focus for clinical safety
    refetchOnReconnect: true,
    enabled,
  });
}

/**
 * Hook for fetching pre-op patients
 * 
 * Used by: Nurse dashboard
 * 
 * @param enabled - Whether the query should run (default: true)
 */
export function usePreOpPatients(enabled = true) {
  return useQuery({
    queryKey: ['nurse', 'patients', 'pre-op'],
    queryFn: async () => {
      const response = await nurseApi.getPreOpPatients();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pre-op patients');
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
 * Hook for fetching post-op patients
 * 
 * Used by: Nurse dashboard
 * 
 * @param enabled - Whether the query should run (default: true)
 */
export function usePostOpPatients(enabled = true) {
  return useQuery({
    queryKey: ['nurse', 'patients', 'post-op'],
    queryFn: async () => {
      const response = await nurseApi.getPostOpPatients();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load post-op patients');
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
