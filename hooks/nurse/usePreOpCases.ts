/**
 * usePreOpCases Hooks
 *
 * React Query hooks for nurse pre-op surgical cases dashboard.
 *
 * Features:
 * - Automatic caching and background refetching
 * - Optimistic updates for status changes
 * - Real-time readiness tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseApi, PreOpSurgicalCase, UpdatePreOpCaseDto } from '@/lib/api/nurse';

/**
 * Query keys for pre-op cases
 */
export const preOpCaseKeys = {
  all: ['nurse', 'pre-op'] as const,
  lists: () => [...preOpCaseKeys.all, 'list'] as const,
  list: (filters?: { status?: string; readiness?: 'ready' | 'pending' }) =>
    [...preOpCaseKeys.lists(), filters] as const,
  details: () => [...preOpCaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...preOpCaseKeys.details(), id] as const,
};

/**
 * Hook for fetching pre-op surgical cases list
 *
 * @param filters - Optional filters for status and readiness
 * @param enabled - Whether the query should run
 */
export function usePreOpCases(
  filters?: { status?: string; readiness?: 'ready' | 'pending' },
  enabled = true
) {
  return useQuery({
    queryKey: preOpCaseKeys.list(filters),
    queryFn: async () => {
      const response = await nurseApi.getPreOpSurgicalCases(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pre-op cases');
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
 * Hook for fetching a single pre-op case with full details
 *
 * @param caseId - The surgical case ID
 * @param enabled - Whether the query should run
 */
export function usePreOpCaseDetails(caseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: preOpCaseKeys.detail(caseId!),
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
      await queryClient.cancelQueries({ queryKey: preOpCaseKeys.detail(caseId) });

      // Snapshot previous value
      const previousCase = queryClient.getQueryData<PreOpSurgicalCase>(
        preOpCaseKeys.detail(caseId)
      );

      // Optimistically update the cache
      if (previousCase && updates.readinessStatus) {
        queryClient.setQueryData<PreOpSurgicalCase>(preOpCaseKeys.detail(caseId), {
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
        queryClient.setQueryData(preOpCaseKeys.detail(caseId), context.previousCase);
      }
    },
    onSuccess: (_data, { caseId }) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: preOpCaseKeys.detail(caseId) });
      queryClient.invalidateQueries({ queryKey: preOpCaseKeys.lists() });
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
      // Invalidate all pre-op queries to refresh lists
      queryClient.invalidateQueries({ queryKey: preOpCaseKeys.all });
      // Show success message (would typically use toast)
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
