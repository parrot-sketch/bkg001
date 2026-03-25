/**
 * usePreOpCases Hooks
 *
 * React Query hooks for nurse pre-op surgical cases dashboard.
 *
 * Features:
 * - Automatic caching and background refetching
 * - Optimistic updates for status changes
 * - Real-time readiness tracking
 * - Pagination support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseApi, PreOpSurgicalCase, UpdatePreOpCaseDto } from '@/lib/api/nurse';
import { queryKeys } from '@/lib/constants/queryKeys';

/**
 * Hook for fetching pre-op surgical cases list
 *
 * @param filters - Optional filters for status, readiness, and pagination
 * @param enabled - Whether the query should run
 */
export function usePreOpCases(
  filters?: { status?: string; readiness?: 'ready' | 'pending'; page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.nurse.wardPrep(filters),
    queryFn: async () => {
      const response = await nurseApi.getPreOpSurgicalCases(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pre-op cases');
      }
      return response.data;
    },
    staleTime: 1000 * 30, // 30 seconds - Tier 2 (HIGH urgency)
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 30, // Poll every 30 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refetch on focus for clinical safety
    refetchOnReconnect: true,
    enabled,
  });
}

/**
 * Hook for fetching a single pre-op case with full details
 *
 * @param caseId - The surgical case ID
 * @param enabled - Whether the query should run
 */
export function usePreOpCaseDetails(caseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.nurse.wardPrepDetail(caseId!),
    queryFn: async () => {
      const response = await nurseApi.getPreOpCaseDetails(caseId!);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load case details');
      }
      return response.data;
    },
    staleTime: 1000 * 15, // 15 seconds - more frequent refresh for detail view
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: enabled && !!caseId,
  });
}

/**
 * Hook for updating a pre-op case's status or details
 *
 * @returns Mutation object with update function
 */
export function useUpdatePreOpCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, updates }: { caseId: string; updates: UpdatePreOpCaseDto }) => {
      const response = await nurseApi.updatePreOpCase(caseId, updates);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update case');
      }
      return response.data;
    },
    onMutate: async ({ caseId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.nurse.wardPrepDetail(caseId) });

      // Snapshot previous value
      const previousCase = queryClient.getQueryData<PreOpSurgicalCase>(
        queryKeys.nurse.wardPrepDetail(caseId)
      );

      // Optimistically update the cache
      if (previousCase && updates.readinessStatus) {
        queryClient.setQueryData<PreOpSurgicalCase>(queryKeys.nurse.wardPrepDetail(caseId), {
          ...previousCase,
          casePlan: previousCase.casePlan
            ? {
              ...previousCase.casePlan,
              readinessStatus: updates.readinessStatus as any,
            }
            : null,
        });
      }

      return { previousCase };
    },
    onError: (_err, { caseId }, context) => {
      // Rollback on error
      if (context?.previousCase) {
        queryClient.setQueryData(queryKeys.nurse.wardPrepDetail(caseId), context.previousCase);
      }
    },
    onSuccess: (_data, { caseId }) => {
      // Invalidate and refetch related queries - including cross-module
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrepDetail(caseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.cases() });
    },
  });
}

/**
 * Hook for marking a case as ready for scheduling
 *
 * @returns Mutation object with markReady function
 */
export function useMarkCaseReady() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const response = await nurseApi.markCaseReadyForScheduling(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark case as ready');
      }
      return response.data;
    },
    onSuccess: (_data, caseId) => {
      // Invalidate all pre-op queries to refresh lists - including cross-module
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.dashboard('current') });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
      console.log(`Case ${caseId} marked as ready for scheduling`);
    },
  });
}

/**
 * Hook for getting summary statistics
 *
 * Derived from the main list query - no additional API call needed
 */

export function usePreOpSummary() {
  const { data, isLoading, error } = usePreOpCases();

  return {
    summary: data?.summary,
    isLoading,
    error,
  };
}

/**
 * Hook for checking inventory status for a specific surgical case
 * 
 * @param caseId - The surgical case ID
 * @param enabled - Whether to run the query (e.g. only when expanded or visible)
 */
export function useInventoryStatus(caseId: string, enabled = false) {
  return useQuery({
    queryKey: ['nurse', 'pre-op', 'inventory', caseId],
    queryFn: async () => {
      const response = await nurseApi.getInventoryStatus(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to check inventory status');
      }
      return response.data;
    },
    enabled: enabled && !!caseId,
    staleTime: 1000 * 60, // 1 minute
  });
}
