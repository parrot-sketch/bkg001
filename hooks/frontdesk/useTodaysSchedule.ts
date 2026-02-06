/**
 * Frontdesk Hooks for Today's Schedule and Check-In
 * 
 * TanStack Query hooks for managing today's appointments and check-in workflow
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { toast } from 'sonner';

/**
 * Hook to fetch today's schedule grouped by status
 */
export function useTodaysSchedule(doctorId?: string) {
    return useQuery({
        queryKey: ['frontdesk', 'schedule', 'today', doctorId],
        queryFn: async () => {
            const response = await frontdeskApi.getTodaysSchedule(doctorId);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch today\'s schedule');
            }

            // Group by status
            const appointments = response.data || [];
            return {
                scheduled: appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED'),
                checkedIn: appointments.filter(a => a.status === 'CHECKED_IN' || a.status === 'READY_FOR_CONSULTATION'),
                inConsultation: appointments.filter(a => a.status === 'IN_CONSULTATION'),
                completed: appointments.filter(a => a.status === 'COMPLETED'),
            };
        },
        refetchInterval: 30000, // Refresh every 30 seconds
        staleTime: 10000, // Consider data stale after 10 seconds
    });
}

/**
 * Hook to check in a patient
 */
export function useCheckIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ appointmentId, notes }: { appointmentId: number; notes?: string }) => {
            const response = await frontdeskApi.checkInPatient(appointmentId, { notes });

            if (!response.success) {
                throw new Error(response.error || 'Failed to check in patient');
            }

            return response.data;
        },
        onSuccess: () => {
            // Invalidate all relevant queries
            queryClient.invalidateQueries({ queryKey: ['frontdesk', 'schedule'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            // REFACTORED: Broad invalidation to ensure it catches ['doctor', doctorId, 'appointments', ...]
            queryClient.invalidateQueries({ queryKey: ['doctor'] });

            toast.success('Patient checked in successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to check in patient');
        },
    });
}
