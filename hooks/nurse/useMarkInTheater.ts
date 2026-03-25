/**
 * Hook: useMarkInTheater
 *
 * React Query mutation for marking a patient as having entered the theater.
 * Transitions case status from IN_PREP → IN_THEATER.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/constants/queryKeys';

export function useMarkInTheater() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (caseId: string) => {
            const response = await fetch(`/api/nurse/surgical-cases/${caseId}/mark-in-theater`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to mark patient in theater');
            }

            return data;
        },
        onSuccess: (_data, caseId) => {
            // Invalidate all related queries to refresh data - cross-module
            queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
            queryClient.invalidateQueries({ queryKey: queryKeys.nurse.theatreSupport('today') });
            queryClient.invalidateQueries({ queryKey: queryKeys.nurse.recovery() });
            queryClient.invalidateQueries({ queryKey: queryKeys.nurse.dashboard('current') });
            queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
            queryClient.invalidateQueries({ queryKey: queryKeys.doctor.cases() });
            
            toast.success('Patient marked as in theater');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to mark patient in theater');
        },
    });
}
