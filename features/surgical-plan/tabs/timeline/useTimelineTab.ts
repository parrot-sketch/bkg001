/**
 * Hook: useTimelineTab
 * 
 * Data loading for timeline tab (read-only).
 * No JSX returned - pure logic only.
 */

import { useQuery } from '@tanstack/react-query';
import { timelineApi } from './timelineApi';
import { mapTimelineDtoToViewModel } from './timelineMappers';
import type { TimelineTabViewModel } from './timelineMappers';

interface UseTimelineTabResult {
  // Data
  viewModel: TimelineTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  refetch: () => void;
}

/**
 * Hook for timeline tab
 */
export function useTimelineTab(caseId: string): UseTimelineTabResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<TimelineTabViewModel, Error>({
    queryKey: ['surgical-plan', 'timeline', caseId],
    queryFn: async () => {
      const response = await timelineApi.getTimeline(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load timeline');
      }
      if (!response.data) {
        throw new Error('No data returned');
      }
      return mapTimelineDtoToViewModel(response.data);
    },
    enabled: !!caseId,
  });

  return {
    viewModel: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}
