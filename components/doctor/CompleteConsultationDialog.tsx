'use client';

/**
 * Complete Consultation Dialog
 * 
 * Modal dialog for completing a consultation.
 * Allows doctor to add outcome and schedule follow-up if needed.
 */

import { useState } from 'react';
import { doctorApi } from '../../lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { CompleteConsultationDto } from '../../application/dtos/CompleteConsultationDto';

interface CompleteConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
  doctorId: string;
}

export function CompleteConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
  doctorId,
}: CompleteConsultationDialogProps) {
  const [outcome, setOutcome] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpType, setFollowUpType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!outcome.trim()) {
      toast.error('Please provide consultation outcome');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CompleteConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        outcome: outcome.trim(),
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        followUpTime: followUpTime || undefined,
        followUpType: followUpType || undefined,
      };

      const response = await doctorApi.completeConsultation(dto);

      if (response.success) {
        toast.success('Consultation completed successfully');
        onSuccess();
        setOutcome('');
        setFollowUpDate('');
        setFollowUpTime('');
        setFollowUpType('');
      } else {
        toast.error(response.error || 'Failed to complete consultation');
      }
    } catch (error) {
      toast.error('An error occurred while completing consultation');
      console.error('Error completing consultation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Complete Consultation</DialogTitle>
          <DialogDescription>
            Record the consultation outcome and optionally schedule a follow-up
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="outcome">Consultation Outcome *</Label>
              <Textarea
                id="outcome"
                placeholder="Enter consultation outcome, diagnosis, treatment plan..."
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                required
                disabled={isSubmitting}
                rows={6}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Follow-up Appointment (Optional)</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="followUpDate">Follow-up Date</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    disabled={isSubmitting}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followUpTime">Follow-up Time</Label>
                  <Input
                    id="followUpTime"
                    type="time"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="followUpType">Follow-up Type</Label>
                <Input
                  id="followUpType"
                  placeholder="e.g., Follow-up, Review, Check-up"
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Completing...' : 'Complete Consultation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
