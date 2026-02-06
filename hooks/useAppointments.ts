'use client';

/**
 * Custom Hook: useAppointments
 * 
 * Provides TanStack Query-powered appointment management with:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Centralized error handling
 * - Loading states
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/patient/useAuth';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

// Query key factory for consistent cache management
export const appointmentKeys = {
    all: ['appointments'] as const,
    lists: () => [...appointmentKeys.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...appointmentKeys.lists(), filters] as const,
    details: () => [...appointmentKeys.all, 'detail'] as const,
    detail: (id: number) => [...appointmentKeys.details(), id] as const,
};

interface UseAppointmentsOptions {
    filters?: {
        status?: string;
        date?: string;
        upcoming?: boolean;
    };
    enabled?: boolean;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { filters, enabled = true } = options;

    // Determine API based on user role
    const api = user?.role === 'FRONTDESK' ? frontdeskApi : doctorApi;

    // Query: Get appointments
    const appointmentsQuery = useQuery({
        queryKey: appointmentKeys.list(filters),
        queryFn: async () => {
            // Get doctor ID from user
            const doctorId = user?.id || '';

            if (!doctorId) {
                return { success: true as const, data: [] as AppointmentResponseDto[] };
            }

            // Handle different filter scenarios
            if (filters?.upcoming) {
                return doctorApi.getUpcomingAppointments(doctorId);
            }
            if (filters?.date) {
                return doctorApi.getTodayAppointments(doctorId);
            }
            if (filters?.status) {
                return doctorApi.getAppointments(doctorId, filters.status);
            }

            // Default: get all appointments
            return doctorApi.getAppointments(doctorId);
        },
        enabled: enabled && !!user,
        staleTime: 1000 * 60 * 2, // 2 minutes
        refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
    });

    // Mutation: Confirm appointment (Doctor only)
    const confirmMutation = useMutation({
        mutationFn: ({ appointmentId, notes }: { appointmentId: number; notes?: string }) =>
            doctorApi.confirmAppointment(appointmentId, 'confirm', { notes }),
        onMutate: async ({ appointmentId }) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({ queryKey: appointmentKeys.all });

            // Snapshot previous value
            const previousAppointments = queryClient.getQueryData(appointmentKeys.list(filters));

            // Optimistic update
            queryClient.setQueryData(appointmentKeys.list(filters), (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.map((apt: any) =>
                        apt.id === appointmentId
                            ? { ...apt, status: 'SCHEDULED' }
                            : apt
                    ),
                };
            });

            return { previousAppointments };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousAppointments) {
                queryClient.setQueryData(appointmentKeys.list(filters), context.previousAppointments);
            }
            toast.error('Failed to confirm appointment');
            console.error('Confirm appointment error:', err);
        },
        onSuccess: (data) => {
            toast.success('Appointment confirmed successfully');
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['doctors', 'availability'] });
        },
    });

    // Mutation: Reschedule appointment
    const rescheduleMutation = useMutation({
        mutationFn: async ({ appointmentId, newDate, newTime, reason }: {
            appointmentId: number;
            newDate: Date;
            newTime: string;
            reason?: string;
        }) => {
            // Combine date and time
            const [hours, minutes] = newTime.split(':');
            const scheduledAt = new Date(newDate);
            scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Use PUT to update appointment
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledAt, notes: reason }),
            });
            return response.json();
        },
        onSuccess: () => {
            toast.success('Appointment rescheduled successfully');
            queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
            queryClient.invalidateQueries({ queryKey: ['doctors', 'availability'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (err) => {
            toast.error('Failed to reschedule appointment');
            console.error('Reschedule error:', err);
        },
    });

    // Mutation: Cancel appointment
    const cancelMutation = useMutation({
        mutationFn: ({ appointmentId, reason }: {
            appointmentId: number;
            reason: string;
        }) => doctorApi.confirmAppointment(appointmentId, 'reject', { rejectionReason: reason }),
        onMutate: async ({ appointmentId }) => {
            await queryClient.cancelQueries({ queryKey: appointmentKeys.all });
            const previousAppointments = queryClient.getQueryData(appointmentKeys.list(filters));

            // Optimistic update
            queryClient.setQueryData(appointmentKeys.list(filters), (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.map((apt: any) =>
                        apt.id === appointmentId
                            ? { ...apt, status: 'CANCELLED' }
                            : apt
                    ),
                };
            });

            return { previousAppointments };
        },
        onError: (err, variables, context) => {
            if (context?.previousAppointments) {
                queryClient.setQueryData(appointmentKeys.list(filters), context.previousAppointments);
            }
            toast.error('Failed to cancel appointment');
            console.error('Cancel error:', err);
        },
        onSuccess: () => {
            toast.success('Appointment cancelled');
            queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
            queryClient.invalidateQueries({ queryKey: ['doctors', 'availability'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mutation: Mark as no-show
    const markNoShowMutation = useMutation({
        mutationFn: async (appointmentId: number) => {
            const response = await fetch(`/api/appointments/${appointmentId}/no-show`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            return response.json();
        },
        onSuccess: () => {
            toast.success('Appointment marked as no-show');
            queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
        },
        onError: (err) => {
            toast.error('Failed to mark as no-show');
            console.error('Mark no-show error:', err);
        },
    });

    // Mutation: Complete appointment
    const completeMutation = useMutation({
        mutationFn: async (appointmentId: number) => {
            const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            return response.json();
        },
        onSuccess: () => {
            toast.success('Appointment marked as completed');
            queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
        },
        onError: (err) => {
            toast.error('Failed to complete appointment');
            console.error('Complete appointment error:', err);
        },
    });

    return {
        // Data
        appointments: (appointmentsQuery.data?.success ? appointmentsQuery.data.data : []) || [],
        isLoading: appointmentsQuery.isLoading,
        error: appointmentsQuery.error,

        // Actions
        confirmAppointment: confirmMutation.mutate,
        rescheduleAppointment: rescheduleMutation.mutate,
        cancelAppointment: cancelMutation.mutate,
        markNoShow: markNoShowMutation.mutate,
        completeAppointment: completeMutation.mutate,

        // Loading states
        isConfirming: confirmMutation.isPending,
        isRescheduling: rescheduleMutation.isPending,
        isCancelling: cancelMutation.isPending,
        isMarkingNoShow: markNoShowMutation.isPending,
        isCompleting: completeMutation.isPending,

        // Refetch
        refetch: appointmentsQuery.refetch,
    };
}

// Hook for single appointment detail
export function useAppointment(appointmentId: number, enabled = true) {
    const queryClient = useQueryClient();

    const appointmentQuery = useQuery({
        queryKey: appointmentKeys.detail(appointmentId),
        queryFn: async () => {
            return doctorApi.getAppointment(appointmentId);
        },
        enabled: enabled && !!appointmentId,
        staleTime: 1000 * 60 * 1, // 1 minute
    });

    return {
        appointment: appointmentQuery.data?.success ? appointmentQuery.data.data : undefined,
        isLoading: appointmentQuery.isLoading,
        error: appointmentQuery.error,
        refetch: appointmentQuery.refetch,
    };
}
