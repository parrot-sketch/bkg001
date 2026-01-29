'use client';

/**
 * Schedule Consultation Dialog
 * 
 * Simplified dialog for scheduling consultations.
 * Doctor or frontdesk can:
 * - Confirm and schedule (using patient's preferred date or doctor's availability)
 * - Propose a different date
 * 
 * Mobile-optimized with touch-friendly controls.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Clock, CheckCircle2, CalendarX } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useAuth } from '@/hooks/patient/useAuth';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { doctorApi } from '@/lib/api/doctor';

interface ScheduleConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: AppointmentResponseDto;
}

type ScheduleOption = 'confirm' | 'propose';

export function ScheduleConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
}: ScheduleConsultationDialogProps) {
  const { user } = useAuth();
  const [scheduleOption, setScheduleOption] = useState<ScheduleOption>('confirm');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with patient's preferred date if available
  useEffect(() => {
    if (appointment.appointmentDate) {
      const date = new Date(appointment.appointmentDate);
      setProposedDate(format(date, 'yyyy-MM-dd'));
      if (appointment.time) {
        setProposedTime(appointment.time);
      }
    } else {
      // Default to tomorrow
      const tomorrow = addDays(new Date(), 1);
      setProposedDate(format(tomorrow, 'yyyy-MM-dd'));
      setProposedTime('09:00');
    }
  }, [appointment, open]);

  const handleSubmit = async () => {
    if (scheduleOption === 'propose' && (!proposedDate || !proposedTime)) {
      toast.error('Please select a date and time');
      return;
    }

    setIsSubmitting(true);

    try {
      const isDoctor = user?.role === 'DOCTOR';

      if (scheduleOption === 'confirm') {
        // Confirm with existing or proposed date - use approve action
        const confirmDate = proposedDate ? new Date(proposedDate) : new Date(appointment.appointmentDate || Date.now());
        const confirmTime = proposedTime || appointment.time || '09:00';

        // Use reviewConsultation with approve action
        const response = await frontdeskApi.reviewConsultation(
          appointment.id,
          'approve',
          {
            reviewNotes: notes.trim() || undefined,
            proposedDate: confirmDate,
            proposedTime: confirmTime,
          }
        );

        if (response.success) {
          toast.success('Consultation scheduled successfully');
          onSuccess();
        } else {
          toast.error(response.error || 'Failed to schedule consultation');
        }
      } else {
        // Propose different date - use approve action with different date
        const response = await frontdeskApi.reviewConsultation(
          appointment.id,
          'approve',
          {
            proposedDate: new Date(proposedDate),
            proposedTime: proposedTime,
            reviewNotes: notes.trim() || `Proposed alternative date: ${format(new Date(proposedDate), 'MMM d, yyyy')} at ${proposedTime}`,
          }
        );

        if (response.success) {
          toast.success('Date proposal sent to patient');
          onSuccess();
        } else {
          toast.error(response.error || 'Failed to propose date');
        }
      }
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      toast.error('An error occurred while scheduling');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Schedule Consultation</DialogTitle>
          <DialogDescription>
            Confirm the consultation date or propose a different time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Schedule Option */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Schedule Option</Label>
            <RadioGroup
              value={scheduleOption}
              onValueChange={(value) => setScheduleOption(value as ScheduleOption)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-gray-200 hover:border-brand-primary transition-colors">
                <RadioGroupItem value="confirm" id="confirm" className="mt-0.5" />
                <Label htmlFor="confirm" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Confirm & Schedule</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Schedule using the proposed date or select a new one
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-gray-200 hover:border-brand-primary transition-colors">
                <RadioGroupItem value="propose" id="propose" className="mt-0.5" />
                <Label htmlFor="propose" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarX className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Propose Different Date</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Suggest an alternative date to the patient
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date & Time Selection */}
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  min={minDate}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the patient or doctor..."
              rows={3}
              disabled={isSubmitting}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !proposedDate || !proposedTime}
              className="flex-1 sm:flex-initial bg-brand-primary hover:bg-brand-primary/90"
            >
              {isSubmitting
                ? 'Scheduling...'
                : scheduleOption === 'confirm'
                ? 'Confirm & Schedule'
                : 'Propose Date'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
