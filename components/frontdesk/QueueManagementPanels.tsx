/**
 * Queue Management Panels
 * 
 * Orchestrates queue sections for frontdesk and nurse roles.
 * Delegates to extracted section components for readability.
 */
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCheckedInAwaitingAssignment, useLiveQueueBoard, useFrontdeskDashboard, useCheckIn } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { useQueueActions } from '@/hooks/frontdesk/useQueueActions';
import { ArrivingTodaySection } from './queue/ArrivingTodaySection';
import { AwaitingAssignmentSection } from './queue/AwaitingAssignmentSection';
import { LiveQueueBoard } from './queue/LiveQueueBoard';

interface QueueManagementPanelsProps {
  role?: 'FRONTDESK' | 'NURSE';
  onRecordVitals?: (patientId: string, appointmentId?: number) => void;
  onAddCareNote?: (patientId: string, appointmentId?: number) => void;
  onPreOpChecklist?: (patientId: string, appointmentId?: number) => void;
}

export function QueueManagementPanels({ 
  role = 'FRONTDESK',
  onRecordVitals,
  onAddCareNote,
  onPreOpChecklist,
}: QueueManagementPanelsProps) {
  const queryClient = useQueryClient();
  const { data: checkedInAwaiting, isLoading: loadingAwaiting, error: errorAwaiting, refetch: refetchAwaiting } = useCheckedInAwaitingAssignment();
  const { data: liveQueue, isLoading: loadingQueue, error: errorQueue, refetch: refetchQueue } = useLiveQueueBoard();
  const { data: dashboard, isLoading: loadingDashboard } = useFrontdeskDashboard();
  const checkInMutation = useCheckIn();

  const scheduledAppointments = dashboard?.todaysSchedule?.scheduled ?? [];

  const handleCheckIn = async (appointmentId: number) => {
    try {
      await checkInMutation.mutateAsync({
        appointmentId,
        notes: 'Checked in at frontdesk',
      });
      refetchAwaiting();
      refetchQueue();
    } catch (error) {
      console.error('Error checking in patient:', error);
    }
  };

  const actions = useQueueActions({
    onAssigned: () => {
      refetchAwaiting();
      refetchQueue();
    },
    onRemoved: () => {
      refetchAwaiting();
      refetchQueue();
    },
    onReassigned: () => {
      refetchAwaiting();
      refetchQueue();
    },
  });

  const isNurse = role === 'NURSE';

  return (
    <div className="space-y-5 w-full">
      {!isNurse && (
        <ArrivingTodaySection
          appointments={scheduledAppointments}
          loading={loadingDashboard}
          onCheckIn={handleCheckIn}
          actionLoading={actions.actionLoading}
        />
      )}

      {!isNurse && (
        <AwaitingAssignmentSection
          patients={checkedInAwaiting ?? []}
          loading={loadingAwaiting}
          error={errorAwaiting}
          onAssign={actions.handleAssignToQueue}
          actionLoading={actions.actionLoading}
        />
      )}

      <LiveQueueBoard
        loading={loadingQueue}
        error={errorQueue}
        queue={liveQueue ?? []}
        isNurse={isNurse}
        onRecordVitals={onRecordVitals}
        onAddCareNote={onAddCareNote}
        onPreOpChecklist={onPreOpChecklist}
        reassignTarget={actions.reassignTarget}
        onReassignClick={(queueId, doctorId) => actions.setReassignTarget({ queueId, doctorId })}
        onReassignConfirm={actions.handleReassign}
        onReassignCancel={() => actions.setReassignTarget(null)}
        onRemove={actions.handleRemoveFromQueue}
        loadingDoctors={false}
        actionLoading={actions.actionLoading}
      />
    </div>
  );
}
