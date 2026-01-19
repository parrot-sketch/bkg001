'use client';

/**
 * Confirm Consultation Dialog
 * 
 * Modal dialog for patients to confirm a scheduled consultation.
 * Used when consultation_request_status is SCHEDULED.
 */

import { useState } from 'react';
import { patientApi } from '@/lib/api/patient';
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
import { Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface ConfirmConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
}

export function ConfirmConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
}: ConfirmConsultationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const response = await patientApi.confirmConsultation(appointment.id);

      if (response.success && response.data) {
        toast.success('Consultation confirmed successfully');
        onSuccess();
      } else {
        toast.error(response.error || 'Failed to confirm consultation');
      }
    } catch (error) {
      toast.error('An error occurred while confirming consultation');
      console.error('Error confirming consultation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Consultation</DialogTitle>
          <DialogDescription>
            Please confirm your availability for this scheduled consultation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">{appointment.time}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{appointment.type}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            By confirming, you acknowledge that you will be available for this consultation at the scheduled time.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Confirming...' : 'Confirm Consultation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
