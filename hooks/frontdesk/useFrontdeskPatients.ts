/**
 * useFrontdeskPatients Hook
 * 
 * React Query hook for fetching patients with pagination for Frontdesk.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';

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
        queryKey: ['frontdesk', 'patients', page, limit, search],
        queryFn: async () => {
            const response = await frontdeskApi.getPatients({ page, limit, q: search });
            if (!response.success) {
                throw new Error(response.error || 'Failed to load patients');
            }
            return response; // Return full response which includes meta (totalRecords, etc.)
        },
        placeholderData: keepPreviousData, // Keep previous data while fetching next page for smooth UX
        staleTime: 1000 * 60, // 1 minute
        enabled,
    });
}
