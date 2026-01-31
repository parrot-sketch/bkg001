/**
 * useDoctorAppointments Hook
 * 
 * React Query hook for fetching all appointments for a doctor.
 * Used for history and patient timeline views.
 */

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';

/**
 * Hook for fetching all appointments for a doctor
 * 
 * @param doctorId - Doctor ID
 * @param enabled - Whether the query should run (default: true)
 */
export function useDoctorAppointments(doctorId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: ['doctor', doctorId, 'appointments', 'all'],
        queryFn: async () => {
            if (!doctorId) {
                throw new Error('Doctor ID is required');
            }
            // Fetch ALL appointments (history + upcoming)
            const response = await doctorApi.getAppointments(doctorId, undefined, true);

            if (!response.success) {
                throw new Error(response.error || 'Failed to load appointments');
            }

            return response.data;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes - sufficient for history
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: 2,
        refetchOnWindowFocus: true,
        enabled: enabled && !!doctorId,
    });
}
