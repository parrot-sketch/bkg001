/**
 * useDoctorAppointments Hook
 * 
 * React Query hook for fetching all appointments for a doctor.
 * Used for history and patient timeline views.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';
import { appointmentKeys } from '@/hooks/useAppointments';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

export function useDoctorAppointments(doctorId: string | undefined, statuses?: string, enabled = true) {
    const filters = useMemo(() => ({ doctorId, status: statuses }), [doctorId, statuses]);
    
    return useQuery({
        queryKey: appointmentKeys.list(filters),
        queryFn: async (): Promise<AppointmentResponseDto[]> => {
            if (!doctorId) {
                throw new Error('Doctor ID is required');
            }
            const response = await doctorApi.getAppointments(doctorId, statuses, true);

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
