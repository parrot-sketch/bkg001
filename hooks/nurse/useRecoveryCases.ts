import { useQuery } from '@tanstack/react-query';
import { nurseApi, RecoveryCasesResponse } from '@/lib/api/nurse';
import { queryKeys } from '@/lib/constants/queryKeys';

export function useRecoveryCases() {
    return useQuery<RecoveryCasesResponse, Error>({
        queryKey: queryKeys.nurse.recovery(),
        queryFn: async () => {
            const response = await nurseApi.getRecoverySurgicalCases();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch recovery cases');
            }
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data;
        },
        staleTime: 1000 * 30, // 30 seconds - local cache freshness
        gcTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: 1000 * 30, // TIER 2 (HIGH) - 30 seconds for recovery monitoring
        refetchOnWindowFocus: true, // Refetch on focus for clinical safety
        refetchOnReconnect: true,
    });
}
