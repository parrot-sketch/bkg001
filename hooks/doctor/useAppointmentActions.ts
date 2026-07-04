'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { doctorApi } from '@/lib/api/doctor';
import { appointmentKeys } from '@/hooks/useAppointments';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface UseAppointmentActionsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAppointmentActions(options: UseAppointmentActionsOptions = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    queryClient.invalidateQueries({ queryKey: ['doctor', 'dashboard'] });
  }, [queryClient]);

  const confirmMutation = useMutation({
    mutationFn: (appointmentId: number) =>
      doctorApi.confirmAppointment(appointmentId, 'confirm'),
    onSuccess: () => {
      invalidate();
      toast.success('Appointment confirmed');
      options.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to confirm appointment');
      options.onError?.(error);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: number; reason: string }) =>
      doctorApi.confirmAppointment(appointmentId, 'reject', { rejectionReason: reason }),
    onSuccess: () => {
      invalidate();
      toast.success('Appointment rejected');
      options.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reject appointment');
      options.onError?.(error);
    },
  });

  const handleConfirm = useCallback((appointmentId: number) => {
    confirmMutation.mutate(appointmentId);
  }, [confirmMutation]);

  const handleReject = useCallback((appointmentId: number) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason?.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    rejectMutation.mutate({ appointmentId, reason: reason.trim() });
  }, [rejectMutation]);

  const handleStartConsultation = useCallback((appointment: AppointmentResponseDto) => {
    router.push(`/doctor/consultations/session/${appointment.id}`);
  }, [router]);

  return {
    confirmMutation,
    rejectMutation,
    handleConfirm,
    handleReject,
    handleStartConsultation,
  };
}
