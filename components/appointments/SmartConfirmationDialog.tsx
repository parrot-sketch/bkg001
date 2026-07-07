'use client';

import { useState, useMemo } from 'react';
import { format, addMinutes, isValid } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

const DURATION_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const hh = hour.toString().padStart(2, '0');
  const label = format(new Date(`2000-01-01T${hh}:00`), 'h:mm a');
  return { value: `${hh}:00`, label };
});

interface SmartConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentResponseDto;
  onSuccess?: () => void;
}

export function SmartConfirmationDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
}: SmartConfirmationDialogProps) {
  const [selectedTime, setSelectedTime] = useState(
    appointment.time || '09:00'
  );
  const [durationMinutes, setDurationMinutes] = useState(
    appointment.consultationDuration?.toString() || '30'
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedDate = useMemo(() => {
    if (!appointment.appointmentDate) return null;
    const d = new Date(appointment.appointmentDate);
    return isValid(d) ? d : null;
  }, [appointment.appointmentDate]);

  const proposedEndTime = useMemo(() => {
    if (!selectedTime || !requestedDate) return null;
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const start = new Date(requestedDate);
    start.setHours(hours, minutes, 0, 0);
    return addMinutes(start, Number(durationMinutes));
  }, [selectedTime, durationMinutes, requestedDate]);

  const recommendedDuration = useMemo(() => {
    const type = (appointment.type || '').toLowerCase();
    if (type.includes('initial')) return '45';
    if (type.includes('follow')) return '20';
    if (type.includes('routine') || type.includes('checkup')) return '20';
    if (type.includes('procedure') || type.includes('surgery')) return '60';
    if (type.includes('emergency')) return '30';
    return '30';
  }, [appointment.type]);

  const isModified = useMemo(() => {
    return (
      selectedTime !== appointment.time ||
      durationMinutes !== (appointment.consultationDuration?.toString() || '30')
    );
  }, [selectedTime, durationMinutes, appointment.time, appointment.consultationDuration]);

  const handleConfirm = async () => {
    if (!selectedTime) {
      toast.error('Please select a time');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/appointments/${appointment.id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm',
            time: selectedTime,
            duration: Number(durationMinutes),
            notes: notes.trim() || undefined,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success(
          isModified
            ? 'Appointment rescheduled and confirmed'
            : 'Appointment confirmed'
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to confirm appointment');
      }
    } catch {
      toast.error('Error confirming appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSubmitting) return;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl border border-[#e7d6bf] bg-white shadow-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-[#2c2e4b]">
            <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf]">
              <CalendarClock className="h-4 w-4 text-[#caa26a]" />
            </div>
            Confirm Appointment
          </DialogTitle>
          <DialogDescription className="text-xs text-[#2c2e4b]/60">
            Review the details below. Adjust the time if needed before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient & Request Summary */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#e7d6bf]/10 border border-[#e7d6bf]">
            <div className="h-9 w-9 rounded-full bg-white border border-[#e7d6bf] flex items-center justify-center text-xs font-semibold text-[#2c2e4b]">
              {appointment.patient
                ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
                : '??'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2c2e4b] truncate">
                {appointment.patient
                  ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                  : 'Unknown Patient'}
              </p>
              <p className="text-[10px] text-[#2c2e4b]/60">
                {appointment.type || 'Consultation'} • Requested{' '}
                {requestedDate
                  ? format(requestedDate, 'EEE, MMM d, yyyy')
                  : '—'}{' '}
                at {appointment.time || '—'}
              </p>
            </div>
          </div>

          {/* Time Adjustment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">
                Date
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e7d6bf] bg-white text-sm text-[#2c2e4b]">
                <CalendarClock className="h-4 w-4 text-[#caa26a] shrink-0" />
                {requestedDate
                  ? format(requestedDate, 'EEE, MMM d')
                  : '—'}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">
                Time
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="h-9 rounded-lg border-[#e7d6bf] bg-white text-sm text-[#2c2e4b]">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">
                Duration
              </Label>
              {durationMinutes !== recommendedDuration && (
                <span className="text-[10px] text-[#caa26a] font-medium">
                  Recommended: {recommendedDuration} min for{' '}
                  {appointment.type || 'this type'}
                </span>
              )}
            </div>
            <Select
              value={durationMinutes}
              onValueChange={setDurationMinutes}
            >
              <SelectTrigger className="h-9 rounded-lg border-[#e7d6bf] bg-white text-sm text-[#2c2e4b]">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Slot End Preview */}
          {proposedEndTime && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e7d6bf]/10 border border-[#e7d6bf]/60">
              <Clock className="h-4 w-4 text-[#caa26a] shrink-0" />
              <p className="text-xs text-[#2c2e4b]/70">
                Session ends at{' '}
                <span className="font-semibold text-[#2c2e4b]">
                  {format(proposedEndTime, 'h:mm a')}
                </span>
              </p>
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">
              Internal Notes{' '}
              <span className="normal-case tracking-normal font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any adjustments or notes for frontdesk..."
              rows={2}
              className="text-sm resize-none rounded-lg border-[#e7d6bf] bg-white focus:border-[#caa26a]"
            />
          </div>

          {/* Modification Warning */}
          {isModified && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#caa26a]/10 border border-[#caa26a]/30">
              <AlertCircle className="h-4 w-4 text-[#caa26a] shrink-0 mt-0.5" />
              <p className="text-xs text-[#2c2e4b]">
                Time or duration has been adjusted from the original request.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-[#e7d6bf] pt-3 mt-2">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            size="sm"
            className="text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedTime}
            size="sm"
            className={cn(
              'h-9 rounded-lg font-medium shadow-sm',
              isModified
                ? 'bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white'
                : 'bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]'
            )}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isModified ? 'Reschedule & Confirm' : 'Confirm'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
