/**
 * Foundation Hook: useSurgicalCasePlanPage
 * 
 * Loads surgical case plan data and timeline for the plan page.
 * Wraps existing React Query hooks with error normalization.
 */

import { useQuery } from '@tanstack/react-query';
import { surgicalPlanApi } from '../api/surgicalPlanApi';
import { mapCasePlanDetailDtoToViewModel } from '../mappers/surgicalPlanMappers';
import type { SurgicalCasePlanViewModel } from '../../core/types';
import { OPERATIVE_STATUSES } from '../../core/constants';

interface UseSurgicalCasePlanPageResult {
  isLoading: boolean;
  error: Error | null;
  data: SurgicalCasePlanViewModel | null;
  refetch: () => void;
  canEdit: boolean;
  canMarkReady: boolean;
  showTimeline: boolean;
}

/**
 * Load surgical case plan page data
 */
export function useSurgicalCasePlanPage(caseId: string): UseSurgicalCasePlanPageResult {
  // Load case plan detail
  const {
    data: casePlanData,
    isLoading: isLoadingPlan,
    error: planError,
    refetch: refetchPlan,
  } = useQuery({
    queryKey: ['surgical-case-plan', caseId],
    queryFn: async () => {
      const response = await surgicalPlanApi.getCasePlanDetail(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load case plan');
      }
      return response.data;
    },
    enabled: !!caseId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Load timeline if case is in operative status
  const shouldLoadTimeline =
    casePlanData && OPERATIVE_STATUSES.has(casePlanData.status);

  const {
    data: timelineData,
    isLoading: isLoadingTimeline,
    error: timelineError,
  } = useQuery({
    queryKey: ['surgical-case-timeline', caseId],
    queryFn: async () => {
      const response = await surgicalPlanApi.getTimeline(caseId);
      if (!response.success) {
        // Timeline is optional, don't throw on error
        return null;
      }
      return response.data;
    },
    enabled: !!caseId && !!shouldLoadTimeline,
    staleTime: 1000 * 30, // 30 seconds
  });

  const isLoading: boolean = Boolean(
    isLoadingPlan || (shouldLoadTimeline && isLoadingTimeline)
  );
  const error: Error | null = (planError || timelineError) as Error | null;

  // Map to view model
  const data = casePlanData
    ? mapCasePlanDetailDtoToViewModel(casePlanData, timelineData ?? null)
    : null;

  // Derived flags (role-based checks will be added in Phase 2)
  const canEdit: boolean = true; // TODO: Add role check in Phase 2
  const canMarkReady: boolean = true; // TODO: Add role check in Phase 2
  const showTimeline: boolean = Boolean(
    timelineData && casePlanData && OPERATIVE_STATUSES.has(casePlanData.status)
  );

  return {
    isLoading,
    error,
    data,
    refetch: () => {
      refetchPlan();
    },
    canEdit,
    canMarkReady,
    showTimeline,
  };
}
