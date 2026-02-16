import { useQuery } from '@tanstack/react-query';
import { nurseApi, RecoveryCasesResponse } from '@/lib/api/nurse';

export const recoveryCaseKeys = {
    all: ['nurse', 'recovery'] as const,
    lists: () => [...recoveryCaseKeys.all, 'list'] as const,
};

export function useRecoveryCases() {
    return useQuery<RecoveryCasesResponse, Error>({
        queryKey: recoveryCaseKeys.lists(),
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
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 60, // Refetch every minute
    });
}
