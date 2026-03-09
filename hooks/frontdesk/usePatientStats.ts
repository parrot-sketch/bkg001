import { useQuery } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';

export function usePatientStats() {
    return useQuery({
        queryKey: ['frontdesk', 'patient-stats'],
        queryFn: async () => {
            const response = await frontdeskApi.getPatientStats();
            if (!response.success) {
                const errorMsg = 'error' in response ? String(response.error) : 'Failed to load patient stats';
                throw new Error(errorMsg);
            }
            if (!response.data) {
                throw new Error('Failed to load patient stats: no data returned');
            }
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // Cache stats for 5 minutes since they are global
    });
}
