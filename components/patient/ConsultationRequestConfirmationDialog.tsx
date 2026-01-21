'use client';

/**
 * Consultation Request Confirmation Dialog
 * 
 * Shows confirmation after successful consultation request submission.
 * Provides clear next steps and option to view the request.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Clock, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format } from 'date-fns';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { getConsultationRequestStatusLabel } from '@/domain/enums/ConsultationRequestStatus';

interface ConsultationRequestConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentResponseDto | null;
}

export function ConsultationRequestConfirmationDialog({
  open,
  onClose,
  appointment,
}: ConsultationRequestConfirmationDialogProps) {
  const router = useRouter();

  const handleViewRequest = () => {
    onClose();
    router.push(`/patient/appointments?highlight=${appointment?.id}`);
  };

  if (!appointment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">Request Submitted Successfully!</DialogTitle>
          </div>
          <DialogDescription>
            Your consultation request has been received and is being reviewed by our clinical team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Details */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Request ID:</span>
              <span className="text-muted-foreground font-mono text-xs">{appointment.id}</span>
            </div>

            {appointment.consultationRequestStatus && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Status:</span>
                <span className="text-muted-foreground">
                  {getConsultationRequestStatusLabel(appointment.consultationRequestStatus as ConsultationRequestStatus)}
                </span>
              </div>
            )}

            {appointment.appointmentDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Appointment Date:</span>
                <span className="text-muted-foreground">
                  {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
                </span>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="font-semibold text-sm mb-2 text-blue-900">What happens next?</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Our clinical team will review your request within 24 hours</li>
              <li>• We'll contact you via phone or email to confirm availability</li>
              <li>• Once confirmed, you'll receive appointment details</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={handleViewRequest} className="flex-1">
            View My Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
