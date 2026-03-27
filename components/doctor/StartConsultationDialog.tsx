'use client';

/**
 * Start Consultation Dialog
 *
 * Clean, modern modal for starting a consultation.
 * Patient is already checked in — doctor begins or navigates away.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Clock, Stethoscope, X, ArrowRight, Loader2 } from 'lucide-react';
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
  const router = useRouter();
  const { user } = useAuth();
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Patient';

  const initials = appointment.patient
    ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  const handleSubmit = async () => {
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

  const handleCancel = () => {
    if (isSubmitting) return;
    setDoctorNotes('');
    router.push('/doctor/appointments');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isSubmitting) handleCancel(); }}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 rounded-2xl overflow-hidden shadow-2xl border-0">
        {/* Header */}
        <div className="relative bg-white px-6 pt-6 pb-4">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="absolute right-4 top-4 h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5 text-slate-500" />
          </button>

          <DialogHeader className="space-y-2.5 text-left">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
            </div>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Start Consultation
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Begin your session with this patient.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Patient card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Avatar className="h-10 w-10 border border-white shadow-sm">
              <AvatarImage src={appointment.patient?.img ?? undefined} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{patientName}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(appointment.appointmentDate), 'MMM d')} at {appointment.time}</span>
                <span className="text-slate-200">·</span>
                <span className="text-slate-500 font-medium">{appointment.type}</span>
              </div>
            </div>
          </div>

          {/* Assistant brief */}
          {appointment.reviewNotes && (
            <div className="bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">
                Assistant Notes
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">{appointment.reviewNotes}</p>
            </div>
          )}

          {/* Quick notes */}
          <div className="space-y-1.5">
            <Label htmlFor="doctorNotes" className="text-xs font-medium text-slate-600">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="doctorNotes"
              placeholder="Any pre-session observations..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              className="resize-none text-sm border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 placeholder:text-slate-300"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 h-10 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Go Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-10 text-sm font-semibold bg-slate-900 hover:bg-black text-white rounded-xl shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Begin Consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
