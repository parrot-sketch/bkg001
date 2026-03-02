/**
 * Hook: useBillingSummaryTab
 * 
 * Data loading for billing summary tab (read-only).
 * No JSX returned - pure logic only.
 */

import { useQuery } from '@tanstack/react-query';
import { billingSummaryApi } from './billingSummaryApi';
import { mapBillingSummaryDtoToViewModel } from './billingSummaryMappers';
import type { BillingSummaryTabViewModel } from './billingSummaryMappers';

interface UseBillingSummaryTabResult {
  // Data
  viewModel: BillingSummaryTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  refetch: () => void;
}

/**
 * Hook for billing summary tab
 */
export function useBillingSummaryTab(caseId: string): UseBillingSummaryTabResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<BillingSummaryTabViewModel, Error>({
    queryKey: ['surgical-plan', 'billing-summary', caseId],
    queryFn: async () => {
      const response = await billingSummaryApi.getBillingSummary(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load billing summary');
      }
      if (!response.data) {
        throw new Error('No data returned');
      }
      return mapBillingSummaryDtoToViewModel(response.data);
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
