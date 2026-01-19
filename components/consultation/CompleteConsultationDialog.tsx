'use client';

/**
 * Complete Consultation Dialog
 * 
 * Medico-legally critical: Finalizes consultation with required outcome and summary.
 * Enforces validation: outcome type and summary are required.
 * 
 * Designed for clinical safety: clear warnings, no accidental completion.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { CompleteConsultationDto } from '@/application/dtos/CompleteConsultationDto';

interface CompleteConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  consultation: ConsultationResponseDto;
  appointment: AppointmentResponseDto;
  doctorId: string;
}

export function CompleteConsultationDialog({
  open,
  onClose,
  onSuccess,
  consultation,
  appointment,
  doctorId,
}: CompleteConsultationDialogProps) {
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | ''>('');
  const [summary, setSummary] = useState('');
  const [patientDecision, setPatientDecision] = useState<PatientDecision | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const isValid = outcomeType !== '' && summary.trim().length > 0;
  const requiresPatientDecision = outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;
  const isValidWithDecision = isValid && (!requiresPatientDecision || patientDecision !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidWithDecision) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CompleteConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        outcome: summary.trim(),
        outcomeType: outcomeType as ConsultationOutcomeType,
        patientDecision: requiresPatientDecision ? (patientDecision as PatientDecision) : undefined,
      };

      const response = await doctorApi.completeConsultation(dto);

      if (response.success) {
        toast.success('Consultation completed successfully');
        onSuccess();
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
            Finalize the consultation with outcome and summary. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <strong>Medico-legal notice:</strong> Once completed, this consultation cannot be edited.
                Ensure all information is accurate and complete.
              </div>
            </div>

            {/* Outcome Type - Required */}
            <div className="space-y-2">
              <Label htmlFor="outcome-type">
                Consultation Outcome <span className="text-destructive">*</span>
              </Label>
              <Select
                value={outcomeType}
                onValueChange={(value) => setOutcomeType(value as ConsultationOutcomeType)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="outcome-type">
                  <SelectValue placeholder="Select outcome type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ConsultationOutcomeType.PROCEDURE_RECOMMENDED}>
                    Procedure Recommended
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.CONSULTATION_ONLY}>
                    Consultation Only
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED}>
                    Follow-Up Consultation Needed
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.PATIENT_DECIDING}>
                    Patient Deciding
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.REFERRAL_NEEDED}>
                    Referral Needed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Patient Decision - Required if Procedure Recommended */}
            {requiresPatientDecision && (
              <div className="space-y-2">
                <Label htmlFor="patient-decision">
                  Patient Decision <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={patientDecision}
                  onValueChange={(value) => setPatientDecision(value as PatientDecision)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="patient-decision">
                    <SelectValue placeholder="Select patient decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PatientDecision.YES}>Yes - Proceed</SelectItem>
                    <SelectItem value={PatientDecision.NO}>No - Decline</SelectItem>
                    <SelectItem value={PatientDecision.PENDING}>Pending - Needs Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Consultation Summary - Required */}
            <div className="space-y-2">
              <Label htmlFor="summary">
                Consultation Summary <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="summary"
                placeholder="Chief complaint, examination findings, assessment, and plan..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                disabled={isSubmitting}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Include: Chief complaint, examination, assessment, and plan
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValidWithDecision || isSubmitting}
              className="bg-primary text-primary-foreground"
            >
              {isSubmitting ? 'Completing...' : 'Complete Consultation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
