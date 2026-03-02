/**
 * Hook: useUsageVarianceTab
 * 
 * Data loading for usage variance tab (read-only).
 * No JSX returned - pure logic only.
 */

import { useQuery } from '@tanstack/react-query';
import { usageVarianceApi } from './usageVarianceApi';
import { mapUsageVarianceDtoToViewModel } from './usageVarianceMappers';
import type { UsageVarianceTabViewModel } from './usageVarianceMappers';

interface UseUsageVarianceTabResult {
  // Data
  viewModel: UsageVarianceTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  refetch: () => void;
}

/**
 * Hook for usage variance tab
 */
export function useUsageVarianceTab(caseId: string): UseUsageVarianceTabResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<UsageVarianceTabViewModel, Error>({
    queryKey: ['surgical-plan', 'usage-variance', caseId],
    queryFn: async () => {
      const response = await usageVarianceApi.getUsageVariance(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load usage variance');
      }
      if (!response.data) {
        throw new Error('No data returned');
      }
      return mapUsageVarianceDtoToViewModel(response.data);
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
