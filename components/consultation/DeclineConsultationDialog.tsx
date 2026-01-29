'use client';

/**
 * Decline Consultation Dialog
 * 
 * Simplified dialog for declining consultation requests.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { frontdeskApi } from '@/lib/api/frontdesk';

interface DeclineConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
  frontdeskUserId: string;
}

export function DeclineConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
}: DeclineConsultationDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await frontdeskApi.reviewConsultation(
        appointment.id,
        'reject',
        {
          reviewNotes: reason.trim(),
        }
      );

      if (response.success) {
        toast.success('Consultation request declined');
        onSuccess();
      } else {
        toast.error(response.error || 'Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining consultation:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Decline Consultation Request</DialogTitle>
          <DialogDescription>
            Please provide a reason for declining this consultation request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="This consultation is not suitable because..."
              rows={5}
              disabled={isSubmitting}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              variant="destructive"
              className="flex-1 sm:flex-initial"
            >
              {isSubmitting ? 'Declining...' : 'Decline Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
