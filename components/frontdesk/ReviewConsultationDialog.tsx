'use client';

/**
 * Review Consultation Dialog
 * 
 * Dialog for frontdesk to review consultation requests with three actions:
 * - Accept for Scheduling (approve)
 * - Request Clarification (needs_more_info)
 * - Mark as Not Suitable (reject)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertCircle, XCircle, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { frontdeskApi } from '@/lib/api/frontdesk';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { format } from 'date-fns';

interface ReviewConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
  frontdeskUserId: string;
}

type ReviewAction = 'approve' | 'needs_more_info' | 'reject';

export function ReviewConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
  frontdeskUserId,
}: ReviewConsultationDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canReview = appointment.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
                   appointment.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW ||
                   appointment.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO;

  const handleSubmit = async () => {
    if (!selectedAction) {
      toast.error('Please select a review action');
      return;
    }

    // Validate action-specific requirements
    if (selectedAction === 'approve') {
      if (!proposedDate || !proposedTime) {
        toast.error('Proposed date and time are required when accepting for scheduling');
        return;
      }
    }

    if (selectedAction === 'needs_more_info') {
      if (!reviewNotes.trim()) {
        toast.error('Review notes are required when requesting clarification');
        return;
      }
    }

    if (selectedAction === 'reject') {
      if (!reviewNotes.trim()) {
        toast.error('Please provide a reason for marking as not suitable');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await frontdeskApi.reviewConsultation(
        appointment.id,
        selectedAction,
        {
          reviewNotes: reviewNotes.trim() || undefined,
          proposedDate: proposedDate ? new Date(proposedDate) : undefined,
          proposedTime: proposedTime || undefined,
        }
      );

      if (response.success) {
        toast.success(
          selectedAction === 'approve'
            ? 'Inquiry accepted for scheduling'
            : selectedAction === 'needs_more_info'
            ? 'Clarification requested from patient'
            : 'Inquiry marked as not suitable'
        );
        onSuccess();
        // Reset form
        setSelectedAction(null);
        setReviewNotes('');
        setProposedDate('');
        setProposedTime('');
      } else {
        toast.error(response.error || 'Failed to review consultation request');
      }
    } catch (error) {
      toast.error('An error occurred while reviewing the consultation request');
      console.error('Error reviewing consultation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionLabel = (action: ReviewAction): string => {
    switch (action) {
      case 'approve':
        return 'Accept for Scheduling';
      case 'needs_more_info':
        return 'Request Clarification';
      case 'reject':
        return 'Mark as Not Suitable';
    }
  };

  const getActionDescription = (action: ReviewAction): string => {
    switch (action) {
      case 'approve':
        return 'Accept this inquiry and propose a session date and time. The patient will be notified to confirm.';
      case 'needs_more_info':
        return 'Request additional information from the patient before proceeding. They will receive a notification with your questions.';
      case 'reject':
        return 'Mark this inquiry as not suitable. The patient will be notified that they are not a suitable candidate for this procedure.';
    }
  };

  const getActionIcon = (action: ReviewAction) => {
    switch (action) {
      case 'approve':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'needs_more_info':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'reject':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  if (!canReview) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Review Consultation Inquiry</DialogTitle>
          <DialogDescription>
            Review the consultation request and take appropriate action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appointment Summary */}
          <div className="rounded-lg border border-border p-4 bg-muted/50">
            <h3 className="font-medium text-sm mb-2">Inquiry Details</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Patient ID:</span> {appointment.patientId}
              </p>
              <p>
                <span className="text-muted-foreground">Procedure:</span> {appointment.type}
              </p>
              {appointment.note && (
                <p>
                  <span className="text-muted-foreground">Notes:</span> {appointment.note}
                </p>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <Label>Select Review Action</Label>
            <div className="grid gap-3">
              {/* Accept for Scheduling */}
              <button
                type="button"
                onClick={() => setSelectedAction('approve')}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors text-left ${
                  selectedAction === 'approve'
                    ? 'border-green-500 bg-green-50'
                    : 'border-border hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                {getActionIcon('approve')}
                <div className="flex-1">
                  <p className="font-medium">{getActionLabel('approve')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getActionDescription('approve')}
                  </p>
                </div>
              </button>

              {/* Request Clarification */}
              <button
                type="button"
                onClick={() => setSelectedAction('needs_more_info')}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors text-left ${
                  selectedAction === 'needs_more_info'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-border hover:border-yellow-300 hover:bg-yellow-50/50'
                }`}
              >
                {getActionIcon('needs_more_info')}
                <div className="flex-1">
                  <p className="font-medium">{getActionLabel('needs_more_info')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getActionDescription('needs_more_info')}
                  </p>
                </div>
              </button>

              {/* Mark as Not Suitable */}
              <button
                type="button"
                onClick={() => setSelectedAction('reject')}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors text-left ${
                  selectedAction === 'reject'
                    ? 'border-red-500 bg-red-50'
                    : 'border-border hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                {getActionIcon('reject')}
                <div className="flex-1">
                  <p className="font-medium">{getActionLabel('reject')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getActionDescription('reject')}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Action-Specific Fields */}
          {selectedAction && (
            <div className="space-y-4 border-t border-border pt-4">
              {/* Proposed Date & Time (for approve) */}
              {selectedAction === 'approve' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="proposedDate">
                      <Calendar className="inline mr-2 h-4 w-4" />
                      Proposed Date *
                    </Label>
                    <Input
                      id="proposedDate"
                      type="date"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proposedTime">
                      <Clock className="inline mr-2 h-4 w-4" />
                      Proposed Time *
                    </Label>
                    <Input
                      id="proposedTime"
                      type="time"
                      value={proposedTime}
                      onChange={(e) => setProposedTime(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Review Notes (for needs_more_info and reject) */}
              {(selectedAction === 'needs_more_info' || selectedAction === 'reject') && (
                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">
                    {selectedAction === 'needs_more_info' ? 'Questions for Patient' : 'Reason for Unsuitability'} *
                  </Label>
                  <Textarea
                    id="reviewNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={
                      selectedAction === 'needs_more_info'
                        ? 'What information do you need from the patient?'
                        : 'Why is this patient not a suitable candidate?'
                    }
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Optional Notes (for approve) */}
              {selectedAction === 'approve' && (
                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="reviewNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Any additional notes for the patient..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedAction}
              className={
                selectedAction === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : selectedAction === 'needs_more_info'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : selectedAction === 'reject'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }
            >
              {isSubmitting ? 'Processing...' : `Confirm ${getActionLabel(selectedAction!)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
