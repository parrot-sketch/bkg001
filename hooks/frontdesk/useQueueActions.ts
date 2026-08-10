import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import { invalidateFrontdeskCache } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { assignPatientToQueue, removeFromQueue, reassignQueue } from '@/app/actions/appointment';
import { toast } from 'sonner';

interface UseQueueActionsOptions {
  onAssigned?: () => void;
  onRemoved?: () => void;
  onReassigned?: () => void;
}

export function useQueueActions(options: UseQueueActionsOptions = {}) {
  const queryClient = useQueryClient();
  const { onAssigned, onRemoved, onReassigned } = options;

  const [showDoctorSelect, setShowDoctorSelect] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [reassignTarget, setReassignTarget] = useState<{ queueId: number; doctorId: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAssignToQueue = useCallback(async (patient: { id: number; patientId: string; isWalkIn?: boolean; patient: { firstName: string; lastName: string } }) => {
    if (!selectedDoctor) return;
    if (!confirm(`Assign ${patient.patient.firstName} ${patient.patient.lastName} to this doctor's queue?`)) return;
    setActionLoading(`assign-${patient.id}`);
    try {
      const result = await assignPatientToQueue({
        patientId: patient.patientId,
        doctorId: selectedDoctor,
        appointmentId: patient.isWalkIn ? undefined : patient.id,
      });
      if (result.success) {
        setShowDoctorSelect(null);
        setSelectedDoctor('');
        await invalidateFrontdeskCache();
        queryClient.invalidateQueries({ queryKey: queryKeys.doctor.queue(selectedDoctor) });
        toast.success('Patient added to queue');
        onAssigned?.();
      } else {
        toast.error(result.msg || 'Failed to add patient to queue');
      }
    } catch (error) {
      console.error('Error assigning patient:', error);
      toast.error('An error occurred while adding to queue');
    } finally {
      setActionLoading(null);
    }
  }, [selectedDoctor, queryClient, onAssigned]);

  const handleRemoveFromQueue = useCallback(async (queueId: number) => {
    if (!confirm('Remove this patient from the queue?')) return;
    setActionLoading(`remove-${queueId}`);
    try {
      const result = await removeFromQueue(queueId, 'Removed by frontdesk');
      if (result.success) {
        await invalidateFrontdeskCache();
        toast.success('Patient removed from queue');
        onRemoved?.();
      } else {
        toast.error(result.msg || 'Failed to remove patient from queue');
      }
    } catch (error) {
      console.error('Error removing patient:', error);
      toast.error('An error occurred while removing patient');
    } finally {
      setActionLoading(null);
    }
  }, [onRemoved]);

  const handleReassign = useCallback(async (queueId: number, newDoctorId: string) => {
    if (!newDoctorId) return;
    if (!confirm(`Reassign this patient to another doctor's queue?`)) return;
    setActionLoading(`reassign-${queueId}`);
    try {
      const result = await reassignQueue(queueId, newDoctorId);
      if (result.success) {
        setReassignTarget(null);
        await invalidateFrontdeskCache();
        queryClient.invalidateQueries({ queryKey: queryKeys.doctor.queue(newDoctorId) });
        toast.success('Patient reassigned successfully');
        onReassigned?.();
      } else {
        toast.error(result.msg || 'Failed to reassign patient');
      }
    } catch (error) {
      console.error('Error reassigning patient:', error);
      toast.error('An error occurred while reassigning patient');
    } finally {
      setActionLoading(null);
    }
  }, [queryClient, onReassigned]);

  return {
    showDoctorSelect,
    setShowDoctorSelect,
    selectedDoctor,
    setSelectedDoctor,
    reassignTarget,
    setReassignTarget,
    actionLoading,
    handleAssignToQueue,
    handleRemoveFromQueue,
    handleReassign,
  };
}
