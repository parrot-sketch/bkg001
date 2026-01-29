'use client';

/**
 * Request Info Dialog
 * 
 * Simplified dialog for requesting additional information from patients.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { frontdeskApi } from '@/lib/api/frontdesk';

interface RequestInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
  frontdeskUserId: string;
}

export function RequestInfoDialog({
  open,
  onClose,
  onSuccess,
  appointment,
}: RequestInfoDialogProps) {
  const [questions, setQuestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!questions.trim()) {
      toast.error('Please provide questions for the patient');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await frontdeskApi.reviewConsultation(
        appointment.id,
        'needs_more_info',
        {
          reviewNotes: questions.trim(),
        }
      );

      if (response.success) {
        toast.success('Information request sent to patient');
        onSuccess();
      } else {
        toast.error(response.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error requesting info:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Additional Information</DialogTitle>
          <DialogDescription>
            What information do you need from the patient?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="questions">Questions for Patient</Label>
            <Textarea
              id="questions"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="Please provide details about..."
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
              disabled={isSubmitting || !questions.trim()}
              className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
