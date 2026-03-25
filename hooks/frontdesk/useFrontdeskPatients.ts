/**
 * useFrontdeskPatients Hook
 * 
 * React Query hook for fetching patients with pagination for Frontdesk.
 * Uses standardized query keys for cache consistency.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { queryKeys } from '@/lib/constants/queryKeys';

interface UseFrontdeskPatientsProps {
    page: number;
    limit: number;
    search?: string;
    enabled?: boolean;
}

export function useFrontdeskPatients({
    page,
    limit,
    search,
    enabled = true,
}: UseFrontdeskPatientsProps) {
    return useQuery({
        queryKey: queryKeys.frontdesk.patients({ page, limit, search }),
        queryFn: async () => {
            const response = await frontdeskApi.getPatients({ page, limit, q: search });
            if (!response.success) {
                throw new Error(response.error || 'Failed to load patients');
            }
            return response;
        },
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60,
        gcTime: 5 * 60 * 1000,
        enabled,
    });
}
