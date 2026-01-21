'use client';

/**
 * Appointment Booking Confirmation Dialog
 * 
 * Shows confirmation after successful appointment booking.
 * Provides appointment details and next steps.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format } from 'date-fns';

interface AppointmentBookingConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentResponseDto | null;
}

export function AppointmentBookingConfirmationDialog({
  open,
  onClose,
  appointment,
}: AppointmentBookingConfirmationDialogProps) {
  const router = useRouter();

  const handleViewAppointment = () => {
    onClose();
    router.push(`/patient/appointments?highlight=${appointment?.id}`);
  };

  if (!appointment) {
    return null;
  }

  const appointmentDate = new Date(appointment.appointmentDate);
  const appointmentDateTime = new Date(appointmentDate);
  if (appointment.time) {
    const [time, period] = appointment.time.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours, 10);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    appointmentDateTime.setHours(hour, parseInt(minutes, 10), 0, 0);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">Appointment Booked!</DialogTitle>
          </div>
          <DialogDescription>
            Your appointment has been successfully scheduled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Appointment Details */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Date:</span>
              <span className="text-muted-foreground">
                {format(appointmentDateTime, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Time:</span>
              <span className="text-muted-foreground">
                {format(appointmentDateTime, 'h:mm a')}
              </span>
            </div>

            {appointment.type && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Type:</span>
                <span className="text-muted-foreground">{appointment.type}</span>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="font-semibold text-sm mb-2 text-blue-900">Important Reminders:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• You'll receive email and SMS reminders 24 hours before your appointment</li>
              <li>• Please arrive 15 minutes early for check-in</li>
              <li>• Bring a valid ID and insurance card (if applicable)</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={handleViewAppointment} className="flex-1">
            View My Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
