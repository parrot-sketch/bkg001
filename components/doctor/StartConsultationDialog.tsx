'use client';

/**
 * Start Consultation Dialog
 * 
 * Modal dialog for starting a consultation.
 * Allows doctor to add initial notes.
 */

import { useState } from 'react';
import { doctorApi } from '../../lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { StartConsultationDto } from '../../application/dtos/StartConsultationDto';

interface StartConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
  doctorId: string;
}

export function StartConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
  doctorId,
}: StartConsultationDialogProps) {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const dto: StartConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        doctorNotes: doctorNotes.trim() || undefined,
      };

      const response = await doctorApi.startConsultation(dto);

      if (response.success) {
        toast.success('Consultation started successfully');
        onSuccess();
        setDoctorNotes('');
      } else {
        toast.error(response.error || 'Failed to start consultation');
      }
    } catch (error) {
      toast.error('An error occurred while starting consultation');
      console.error('Error starting consultation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start Consultation</DialogTitle>
          <DialogDescription>
            Add initial notes and start the consultation for this appointment
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doctorNotes">Initial Notes (Optional)</Label>
              <Textarea
                id="doctorNotes"
                placeholder="Enter any initial observations or notes..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                disabled={isSubmitting}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                You can add detailed notes when completing the consultation
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Starting...' : 'Start Consultation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
