'use client';

/**
 * Stale Consultation Resolve Dialog
 *
 * Confirmation dialog for resolving overdue/in-progress consultations.
 * Handles both "complete" and "cancel" resolution actions.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { invalidateFrontdeskCache } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ResolveAction = 'complete' | 'cancel';

interface StaleConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ResolveAction | null;
  appointmentId: number;
  patientName: string;
}

export function StaleConsultationDialog({
  open,
  onOpenChange,
  action,
  appointmentId,
  patientName,
}: StaleConsultationDialogProps) {
  const queryClient = useQueryClient();
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    if (!action) return;

    setIsResolving(true);
    try {
      const response = await frontdeskApi.resolveStaleAppointment(appointmentId, action);
      if (response.success) {
        toast.success(
          action === 'complete' ? 'Consultation marked as completed' : 'Appointment cancelled',
        );
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        await invalidateFrontdeskCache();
      } else {
        toast.error(response.error || 'Failed to resolve appointment');
      }
    } catch {
      toast.error('An error occurred while resolving the appointment');
    } finally {
      setIsResolving(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === 'complete'
              ? 'Mark Consultation as Completed?'
              : 'Cancel Appointment?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === 'complete'
              ? `This will mark ${patientName}'s consultation as completed.`
              : `This will cancel ${patientName}'s appointment.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResolving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResolve}
            disabled={isResolving}
            className={
              action === 'complete'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }
          >
            {isResolving
              ? 'Processing…'
              : action === 'complete'
                ? 'Mark Completed'
                : 'Cancel Appointment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Hook for managing dialog state ───────────────────────────

export function useStaleConsultationDialog() {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<ResolveAction | null>(null);

  const openDialog = (resolveAction: ResolveAction) => {
    setAction(resolveAction);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setAction(null);
  };

  return { open, action, openDialog, onOpenChange: handleOpenChange };
}
