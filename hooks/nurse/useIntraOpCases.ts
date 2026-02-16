import { useQuery } from '@tanstack/react-query';
import { nurseApi, IntraOpCasesResponse } from '@/lib/api/nurse';

export const intraOpCaseKeys = {
    all: ['nurse', 'intra-op'] as const,
    lists: () => [...intraOpCaseKeys.all, 'list'] as const,
};

export function useIntraOpCases() {
    return useQuery<IntraOpCasesResponse, Error>({
        queryKey: intraOpCaseKeys.lists(),
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
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 60, // Refetch every minute
    });
}
