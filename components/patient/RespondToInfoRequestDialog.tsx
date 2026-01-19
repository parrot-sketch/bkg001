'use client';

/**
 * Respond to Info Request Dialog
 * 
 * Modal dialog for patients to respond when consultation status is NEEDS_MORE_INFO.
 * Allows patients to provide additional information requested by frontdesk.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Info } from 'lucide-react';

interface RespondToInfoRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
}

export function RespondToInfoRequestDialog({
  open,
  onClose,
  onSuccess,
  appointment,
}: RespondToInfoRequestDialogProps) {
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!additionalInfo.trim()) {
      toast.error('Please provide the requested information');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement API endpoint for resubmitting with additional info
      // For now, this is a placeholder that shows the structure
      // The actual endpoint would be: POST /api/consultations/:id/resubmit
      toast.info('This feature is being implemented. Please contact the clinic directly with your additional information.');
      
      // Once API is ready:
      // const response = await patientApi.resubmitConsultation(appointment.id, {
      //   additionalInfo: additionalInfo.trim(),
      // });
      // if (response.success) {
      //   toast.success('Additional information submitted successfully');
      //   onSuccess();
      //   setAdditionalInfo('');
      // } else {
      //   toast.error(response.error || 'Failed to submit information');
      // }
      
      // Temporary: close after showing message
      setTimeout(() => {
        onSuccess();
        setAdditionalInfo('');
      }, 2000);
    } catch (error) {
      toast.error('An error occurred while submitting information');
      console.error('Error submitting information:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-primary" />
            <span>Additional Information Requested</span>
          </DialogTitle>
          <DialogDescription>
            Please provide the additional information requested by our team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {appointment.reviewNotes && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Request from clinic:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {appointment.reviewNotes}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="additional-info">Your Response</Label>
            <Textarea
              id="additional-info"
              placeholder="Please provide the requested information here..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={6}
              disabled={isSubmitting}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              You can include photos or attachments in your message. Our team will review your response promptly.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !additionalInfo.trim()}>
            {isSubmitting ? 'Submitting...' : 'Submit Information'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
