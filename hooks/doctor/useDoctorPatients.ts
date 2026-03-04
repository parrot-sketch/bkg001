/**
 * useDoctorPatients Hook
 * 
 * React Query hook for fetching the current doctor's patients from explicit
 * assignment records.
 * 
 * UPDATED: Now queries DoctorPatientAssignment table (filtered by ACTIVE status)
 * instead of inferring from Appointment history. This provides:
 * - Explicit care relationships
 * - Clear active/inactive/discharged/transferred states
 * - Proper doctor-patient roster management
 * 
 * Supports filtering by assignment status and pagination.
 */

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';

interface UseDoctorPatientsOptions {
  enabled?: boolean;
  status?: 'ACTIVE' | 'DISCHARGED' | 'TRANSFERRED' | 'INACTIVE'; // Default: ACTIVE
  skip?: number;
  take?: number;
}

/**
 * Hook for fetching doctor's patients from assignments
 * 
 * @param enabled - Whether the query should run (default: true)
 * @param status - Filter by assignment status (default: ACTIVE)
 * @param skip - Pagination offset (default: 0)
 * @param take - Records per page (default: 50)
 */
export function useDoctorPatients(enabled = true, options?: UseDoctorPatientsOptions) {
    return useQuery({
        queryKey: ['doctor', 'me', 'patients', options?.status || 'ACTIVE', options?.skip || 0],
        queryFn: async () => {
            const response = await doctorApi.getMyPatients({
                status: options?.status || 'ACTIVE',
                skip: options?.skip || 0,
                take: options?.take || 50,
            });
            if (!response.success) {
                throw new Error(response.error || 'Failed to load patients');
            }
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes - patient roster doesn't change often
        gcTime: 1000 * 60 * 15, // 15 minutes
        retry: 2,
        refetchOnWindowFocus: true,
        enabled,
    });
}
