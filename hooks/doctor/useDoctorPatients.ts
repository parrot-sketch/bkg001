/**
 * useDoctorPatients Hook
 * 
 * React Query hook for fetching the current doctor's patients.
 */

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';

/**
 * Hook for fetching doctor's patients
 * 
 * @param enabled - Whether the query should run (default: true)
 */
export function useDoctorPatients(enabled = true) {
    return useQuery({
        queryKey: ['doctor', 'me', 'patients'],
        queryFn: async () => {
            const response = await doctorApi.getMyPatients();
            if (!response.success) {
                throw new Error(response.error || 'Failed to load patients');
            }
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes - patient list doesn't change that often
        gcTime: 1000 * 60 * 15, // 15 minutes
        retry: 2,
        refetchOnWindowFocus: true,
        enabled,
    });
}
