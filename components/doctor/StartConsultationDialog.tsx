'use client';

/**
 * Start Consultation Dialog
 * 
 * Modal dialog for starting a consultation.
 * Allows doctor to add initial notes.
 */

import { useState, useEffect } from 'react';
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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { StartConsultationDto } from '@/application/dtos/StartConsultationDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { ConsultationReadinessIndicator, computeReadiness } from '@/components/consultation/ConsultationReadinessIndicator';

interface StartConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);

  // Load patient information when dialog opens
  useEffect(() => {
    if (open && appointment.patientId) {
      loadPatientInfo();
    }
  }, [open, appointment.patientId]);

  const loadPatientInfo = async () => {
    try {
      setLoadingPatient(true);
      const patientResponse = await doctorApi.getPatient(appointment.patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
        // TODO: Load photo count from API
        setPhotoCount(0);
      }
    } catch (error) {
      console.error('Error loading patient info:', error);
    } finally {
      setLoadingPatient(false);
    }
  };

  const readiness = patient ? computeReadiness(patient, appointment, photoCount) : null;
  const isReady = readiness
    ? readiness.intakeComplete &&
      readiness.photosUploaded &&
      readiness.medicalHistoryComplete &&
      readiness.consentAcknowledged
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const dto: StartConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        doctorNotes: doctorNotes.trim() || undefined,
      };

      const response = await doctorApi.startConsultation(dto);

      if (response.success) {
        toast.success('Consultation started successfully');
        onSuccess();
        setDoctorNotes('');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start Consultation</DialogTitle>
          <DialogDescription>
            Add initial notes and start the consultation for this appointment
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Readiness Check */}
            {loadingPatient ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">Checking patient file...</p>
              </div>
            ) : readiness ? (
              <div className="space-y-3">
                <ConsultationReadinessIndicator readiness={readiness} compact={false} />
                {!isReady && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800">
                        Patient file is not fully prepared. Review missing items above before starting consultation.
                        You can proceed, but it's recommended to ensure all required items are complete.
                      </p>
                    </div>
                  </div>
                )}
                {isReady && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        Patient file is fully prepared. Ready to begin consultation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Assistant Brief (if available) */}
            {appointment.reviewNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-foreground">Assistant Brief</span>
                  {appointment.reviewedBy && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Prepared by Assistant
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{appointment.reviewNotes}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="doctorNotes">Initial Clinical Notes (Optional)</Label>
              <Textarea
                id="doctorNotes"
                placeholder="Enter any initial observations, concerns, or notes for this consultation..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                disabled={isSubmitting}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                You can add detailed clinical notes when completing the consultation
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={isReady ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
            >
              {isSubmitting ? 'Starting...' : isReady ? 'Begin Consultation' : 'Begin Consultation (Review File)'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
