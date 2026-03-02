/**
 * Hook: useUsedItemsTab
 * 
 * Data loading for used items tab (read-only).
 * No JSX returned - pure logic only.
 */

import { useQuery } from '@tanstack/react-query';
import { usedItemsApi } from './usedItemsApi';
import { mapUsedItemsDtoToViewModel } from './usedItemsMappers';
import type { UsedItemsTabViewModel } from './usedItemsMappers';

interface UseUsedItemsTabResult {
  // Data
  viewModel: UsedItemsTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  refetch: () => void;
}

/**
 * Hook for used items tab
 */
export function useUsedItemsTab(caseId: string): UseUsedItemsTabResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<UsedItemsTabViewModel, Error>({
    queryKey: ['surgical-plan', 'used-items', caseId],
    queryFn: async () => {
      const response = await usedItemsApi.getUsedItems(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load used items');
      }
      if (!response.data) {
        throw new Error('No data returned');
      }
      return mapUsedItemsDtoToViewModel(response.data);
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
