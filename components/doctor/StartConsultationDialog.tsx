'use client';

/**
 * Start Consultation Dialog
 * 
 * Streamlined modal for starting a consultation.
 * Patient is already checked in - doctor can start immediately.
 * 
 * Simplified workflow:
 * - Patient checked in by frontdesk → CHECKED_IN
 * - Doctor clicks "Start" → Opens this dialog
 * - Doctor adds optional notes → Clicks "Begin"
 * - System transitions to IN_CONSULTATION → Routes to consultation interface
 * 
 * No readiness checks here - those belong to the surgery/procedure workflow.
 */

import { useState } from 'react';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
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
import { User, Calendar, Clock, Stethoscope } from 'lucide-react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { StartConsultationDto } from '@/application/dtos/StartConsultationDto';
import { useAuth } from '@/hooks/patient/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface StartConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (appointmentId: number) => void;
  appointment: AppointmentResponseDto;
  doctorId: string;
}

export function StartConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
  doctorId,
}: StartConsultationDialogProps) {
  const { user } = useAuth();
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Patient';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dto: StartConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        userId: user?.id || doctorId,
        doctorNotes: doctorNotes.trim() || undefined,
      };

      const response = await doctorApi.startConsultation(dto);

      if (response.success) {
        toast.success('Consultation started');
        setDoctorNotes('');
        onSuccess(appointment.id);
      } else {
        toast.error(response.error || 'Failed to start consultation');
      }
    } catch (error) {
      toast.error('An error occurred while starting consultation');
      console.error('Error starting consultation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Stethoscope className="h-5 w-5" />
              Begin Consultation
            </DialogTitle>
            <DialogDescription className="text-emerald-100">
              Patient is checked in and ready to be seen.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Patient Summary Card */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                <AvatarImage src={appointment.patient?.img ?? undefined} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                  {patientName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{patientName}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(appointment.appointmentDate), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {appointment.time}
                  </span>
                </div>
              </div>
              <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md">
                {appointment.type}
              </div>
            </div>

            {/* Assistant Brief (if available) */}
            {appointment.reviewNotes && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                  Assistant Brief
                </p>
                <p className="text-sm text-blue-900">{appointment.reviewNotes}</p>
              </div>
            )}

            {/* Optional Notes */}
            <div className="space-y-2">
              <Label htmlFor="doctorNotes" className="text-slate-700 font-medium">
                Quick Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="doctorNotes"
                placeholder="Any observations before starting..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="resize-none border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? 'Starting...' : 'Begin Consultation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
