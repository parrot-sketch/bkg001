/**
 * Doctor Hooks for Consultation Management
 * 
 * TanStack Query hooks for starting and ending consultations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

/**
 * Hook to start a consultation
 */
export function useStartConsultation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (appointmentId: number) => {
            const response = await apiClient.post<any>(`/appointments/${appointmentId}/start-consultation`, {});

            if (!response.success) {
                throw new Error(response.error || 'Failed to start consultation');
            }

            return response.data;
        },
        onSuccess: (_data, variables) => {
            // Invalidate all relevant queries
            // REFACTORED: Broad invalidation to ensure it catches ['doctor', doctorId, 'appointments', ...]
            queryClient.invalidateQueries({ queryKey: ['doctor'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['frontdesk', 'schedule'] });

            // CRITICAL: Invalidate the specific consultation cache so the session page sees the new state
            queryClient.invalidateQueries({ queryKey: ['consultation', variables] });

            toast.success('Consultation started');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to start consultation');
        },
    });
}

/**
 * Hook to end a consultation
 */
export function useEndConsultation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            appointmentId,
            consultationNotes,
            nextSteps
        }: {
            appointmentId: number;
            consultationNotes?: string;
            nextSteps?: string;
        }) => {
            const response = await apiClient.post<any>(`/appointments/${appointmentId}/end-consultation`, {
                consultationNotes,
                nextSteps
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to end consultation');
            }

            return response.data;
        },
        onSuccess: () => {
            // Invalidate all relevant queries
            // REFACTORED: Broad invalidation to ensure it catches ['doctor', doctorId, 'appointments', ...]
            queryClient.invalidateQueries({ queryKey: ['doctor'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['frontdesk', 'schedule'] });

            toast.success('Consultation completed');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to end consultation');
        },
    });
}

/**
 * Hook to confirm or reject an appointment pending doctor confirmation
 * 
 * Used when frontdesk books an appointment and doctor needs to approve it.
 */
export function useConfirmAppointment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            appointmentId,
            action,
            rejectionReason,
            notes
        }: {
            appointmentId: number;
            action: 'confirm' | 'reject';
            rejectionReason?: string;
            notes?: string;
        }) => {
            const response = await apiClient.post<any>(`/appointments/${appointmentId}/confirm`, {
                appointmentId,
                action,
                rejectionReason,
                notes
            });

            if (!response.success) {
                throw new Error(response.error || `Failed to ${action} appointment`);
            }

            return response.data;
        },
        onSuccess: (_data, variables) => {
            // Invalidate all relevant queries
            queryClient.invalidateQueries({ queryKey: ['doctor'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['frontdesk'] });

            const actionText = variables.action === 'confirm' ? 'confirmed' : 'declined';
            toast.success(`Appointment ${actionText}`);
        },
        onError: (error: Error, variables) => {
            const actionText = variables.action === 'confirm' ? 'confirm' : 'decline';
            toast.error(error.message || `Failed to ${actionText} appointment`);
        },
    });
}
