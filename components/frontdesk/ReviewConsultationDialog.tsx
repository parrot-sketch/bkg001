'use client';

/**
 * Review Consultation Dialog
 * 
 * Modal dialog for Frontdesk to review consultation requests.
 * Supports approve, request more info, or reject actions.
 */

import { useState } from 'react';
import { frontdeskApi } from '../../lib/api/frontdesk';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
}

export function ReviewConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
}: ReviewConsultationDialogProps) {
  const [action, setAction] = useState<'approve' | 'needs_more_info' | 'reject'>('approve');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate required fields based on action
    if (action === 'approve' && (!proposedDate || !proposedTime)) {
      toast.error('Please provide proposed date and time when approving');
      return;
    }

    if (action === 'needs_more_info' && !reviewNotes.trim()) {
      toast.error('Please provide notes when requesting more information');
      return;
    }

    if (action === 'reject' && !reviewNotes.trim()) {
      toast.error('Please provide a reason when marking as not suitable');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await frontdeskApi.reviewConsultation(
        appointment.id,
        action,
        {
          reviewNotes: reviewNotes.trim() || undefined,
          proposedDate: proposedDate ? new Date(proposedDate) : undefined,
          proposedTime: proposedTime || undefined,
        }
      );

      if (response.success && response.data) {
        const actionMessages = {
          approve: 'Consultation approved and scheduled successfully',
          needs_more_info: 'Request for additional information sent successfully',
          reject: 'Consultation marked as not suitable',
        };
        toast.success(actionMessages[action]);
        onSuccess();
        // Reset form
        setAction('approve');
        setProposedDate('');
        setProposedTime('');
        setReviewNotes('');
      } else {
        toast.error(response.error || 'Failed to review consultation');
      }
    } catch (error) {
      toast.error('An error occurred while reviewing consultation');
      console.error('Error reviewing consultation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Review Consultation Request</DialogTitle>
          <DialogDescription>
            Review and take action on this consultation request
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Appointment Info */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-sm font-medium">Request Details</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-medium">Patient:</span> {appointment.patientId}</p>
              <p><span className="font-medium">Service:</span> {appointment.type}</p>
              {appointment.appointmentDate && (
                <p>
                  <span className="font-medium">Preferred:</span>{' '}
                  {format(new Date(appointment.appointmentDate), 'MMM d, yyyy')} at {appointment.time}
                </p>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-2">
            <Label>Action</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={action === 'approve' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAction('approve')}
              >
                Approve & Schedule
              </Button>
              <Button
                type="button"
                variant={action === 'needs_more_info' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAction('needs_more_info')}
              >
                Request More Info
              </Button>
              <Button
                type="button"
                variant={action === 'reject' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setAction('reject')}
              >
                Not Suitable
              </Button>
            </div>
          </div>

          {/* Approve: Date & Time */}
          {action === 'approve' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="proposed-date">Proposed Date *</Label>
                <Input
                  id="proposed-date"
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  disabled={isSubmitting}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposed-time">Proposed Time *</Label>
                <Input
                  id="proposed-time"
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Notes for needs_more_info or reject */}
          {(action === 'needs_more_info' || action === 'reject') && (
            <div className="space-y-2">
              <Label htmlFor="review-notes">
                {action === 'needs_more_info' ? 'Information Request *' : 'Reason *'}
              </Label>
              <Textarea
                id="review-notes"
                placeholder={
                  action === 'needs_more_info'
                    ? 'Please specify what additional information is needed (e.g., "Please upload reference photos of the area")'
                    : 'Please provide a patient-friendly reason (e.g., "We recommend scheduling a general consultation first")'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                disabled={isSubmitting}
                className="resize-none"
              />
              {action === 'reject' && (
                <p className="text-xs text-muted-foreground">
                  Use gentle, professional language. Example: "Not suitable at this time"
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
