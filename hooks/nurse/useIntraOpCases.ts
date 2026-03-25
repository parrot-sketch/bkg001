import { useQuery } from '@tanstack/react-query';
import { nurseApi, IntraOpCasesResponse } from '@/lib/api/nurse';
import { queryKeys } from '@/lib/constants/queryKeys';

export function useIntraOpCases() {
    return useQuery<IntraOpCasesResponse, Error>({
        queryKey: queryKeys.nurse.theatreSupport('today'),
        queryFn: async () => {
            const response = await nurseApi.getIntraOpSurgicalCases();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch intra-op cases');
            }
            if (!response.data) {
                throw new Error('No data received');
            }
            // Ensure date strings are converted to Date objects
            return {
                ...response.data,
                cases: response.data.cases.map(c => ({
                    ...c,
                    startTime: c.startTime ? new Date(c.startTime) : undefined
                }))
            };
        },
        staleTime: 1000 * 30, // 30 seconds - local cache freshness
        gcTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: 1000 * 10, // TIER 1 (CRITICAL) - 10 seconds for live surgery
        refetchOnWindowFocus: true, // Refetch on focus for clinical safety
        refetchOnReconnect: true,
    });
}
