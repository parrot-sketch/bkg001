'use client';

/**
 * Check-in Dialog
 * 
 * Modal dialog for checking in a patient.
 * Confirms patient arrival and updates appointment status.
 */

import { useState } from 'react';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format } from 'date-fns';

interface CheckInDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
  frontdeskUserId: string;
}

export function CheckInDialog({
  open,
  onClose,
  onSuccess,
  appointment,
  frontdeskUserId,
}: CheckInDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckIn = async () => {
    setIsSubmitting(true);

    try {
      const response = await doctorApi.checkInPatient(appointment.id, frontdeskUserId);

      if (response.success) {
        toast.success('Patient checked in successfully');
        onSuccess();
      } else {
        toast.error(response.error || 'Failed to check in patient');
      }
    } catch (error) {
      toast.error('An error occurred while checking in patient');
      console.error('Error checking in patient:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check In Patient</DialogTitle>
          <DialogDescription>Confirm patient arrival for this appointment</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border p-4 space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">Appointment Details</p>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Date:</span>{' '}
                {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
              </p>
              <p>
                <span className="font-medium">Time:</span> {appointment.time}
              </p>
              <p>
                <span className="font-medium">Patient:</span> {appointment.patientId}
              </p>
              <p>
                <span className="font-medium">Type:</span> {appointment.type}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This will mark the patient as checked in and update the appointment status.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCheckIn} disabled={isSubmitting}>
            {isSubmitting ? 'Checking in...' : 'Check In Patient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
