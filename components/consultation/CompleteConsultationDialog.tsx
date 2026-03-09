'use client';

/**
 * Complete Consultation Dialog — Review & Confirm
 * 
 * This dialog is a CONFIRMATION step, not a data-entry step.
 */

import { useState, useMemo } from 'react';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { useAppointmentBilling } from '@/hooks/doctor/useBilling';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { CompleteConsultationDto } from '@/application/dtos/CompleteConsultationDto';

// Sub-components
import { OutcomeSelector } from './complete/OutcomeSelector';
import { DocumentationChecklist } from './complete/DocumentationChecklist';
import { SummaryEditor } from './complete/SummaryEditor';
import { BillingSummary } from './complete/BillingSummary';

interface CompleteConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (redirectPath?: string) => void;
  consultation: ConsultationResponseDto;
  appointment: AppointmentResponseDto;
  doctorId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Generate a clean summary from structured notes.
 */
function generateSummary(notes: {
  chiefComplaint?: string;
  examination?: string;
  plan?: string;
}): string {
  const parts: string[] = [];

  const chief = notes.chiefComplaint ? stripHtml(notes.chiefComplaint) : '';
  const exam = notes.examination ? stripHtml(notes.examination) : '';
  const plan = notes.plan ? stripHtml(notes.plan) : '';

  if (chief) parts.push(`Patient Concerns: ${chief}`);
  if (exam) parts.push(`Examination: ${exam}`);
  if (plan) parts.push(`Plan: ${plan}`);

  return parts.join('\n\n');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CompleteConsultationDialog({
  open,
  onClose,
  onSuccess,
  consultation,
  appointment,
  doctorId,
}: CompleteConsultationDialogProps) {
  const { state, setOutcome, setPatientDecision } = useConsultationContext();
  const [localOutcome, setLocalOutcome] = useState<ConsultationOutcomeType | ''>(state.outcomeType || '');

  // Summary logic
  const autoSummary = useMemo(() => generateSummary(state.notes), [state.notes]);
  const [summary, setSummary] = useState('');
  const [summaryEdited, setSummaryEdited] = useState(false);
  const effectiveSummary = summaryEdited ? summary : autoSummary;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionChoice, setActionChoice] = useState<'complete' | 'plan' | null>(null);

  // Billing data (read-only)
  const { data: existingBilling } = useAppointmentBilling(appointment.id, open);
  const hasBilling = !!existingBilling?.payment?.billItems?.length;
  const billingTotal = existingBilling?.payment?.totalAmount ?? 0;
  const billingDiscount = existingBilling?.payment?.discount ?? 0;
  const billingStatus = existingBilling?.payment?.status;

  // Validation
  const isProcedure = localOutcome === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;
  const isFollowUp = localOutcome === ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED;
  const missingOutcome = !localOutcome;
  const missingSummary = !effectiveSummary.trim();

  const validationErrors: string[] = [];
  if (missingOutcome) validationErrors.push('Please select a consultation outcome');
  if (missingSummary) validationErrors.push('No notes documented — at least one section is required');

  const isValid = validationErrors.length === 0;

  // Notes completeness check
  const hasChief = !!state.notes.chiefComplaint && stripHtml(state.notes.chiefComplaint).length > 0;
  const hasExam = !!state.notes.examination && stripHtml(state.notes.examination).length > 0;
  const hasPlan = !!state.notes.plan && stripHtml(state.notes.plan).length > 0;

  const handleSubmit = async (choice: 'complete' | 'plan') => {
    if (!isValid || !localOutcome) return;

    setOutcome(localOutcome);
    if (localOutcome === ConsultationOutcomeType.PROCEDURE_RECOMMENDED) {
      setPatientDecision(PatientDecision.YES);
    }

    setActionChoice(choice);
    setIsSubmitting(true);

    try {
      const dto: CompleteConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        outcome: effectiveSummary.trim(),
        outcomeType: localOutcome,
        patientDecision: localOutcome === ConsultationOutcomeType.PROCEDURE_RECOMMENDED ? PatientDecision.YES : undefined,
      };

      const response = await doctorApi.completeConsultation(dto);

      if (response.success) {
        if (isProcedure) {
          toast.success('Consultation completed. Patient added to surgery waiting list.');
          if (choice === 'plan') {
            onSuccess(`/doctor/operative/plan/${appointment.id}/new`);
          } else {
            onSuccess();
          }
        } else if (isFollowUp) {
          toast.success('Consultation completed. Redirecting to schedule follow-up…');
          const params = new URLSearchParams({
            patientId: appointment.patientId,
            type: 'Follow-up',
            source: 'DOCTOR_FOLLOW_UP',
            parentAppointmentId: String(appointment.id),
            parentConsultationId: String(consultation.id),
          });
          onSuccess(`/doctor/appointments/new?${params.toString()}`);
        } else {
          toast.success('Consultation completed successfully');
          onSuccess();
        }
      } else {
        toast.error(response.error || 'Failed to complete consultation');
      }
    } catch (error) {
      toast.error('An error occurred while completing consultation');
      console.error('Error completing consultation:', error);
    } finally {
      setIsSubmitting(false);
      setActionChoice(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Review & Complete
          </DialogTitle>
          <DialogDescription>
            Review your documentation before finalizing. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {!isValid && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle className="h-4 w-4" />
                Missing Required Information
              </div>
              <ul className="space-y-1 ml-6">
                {validationErrors.map((error, i) => (
                  <li key={i} className="text-xs text-red-700 list-disc">{error}</li>
                ))}
              </ul>
            </div>
          )}

          <OutcomeSelector 
            value={localOutcome} 
            onValueChange={setLocalOutcome} 
            isProcedure={isProcedure} 
            isFollowUp={isFollowUp} 
          />

          <DocumentationChecklist 
            hasChief={hasChief} 
            hasExam={hasExam} 
            hasPlan={hasPlan} 
          />

          <SummaryEditor 
            autoSummary={autoSummary} 
            summary={summary} 
            summaryEdited={summaryEdited} 
            onSummaryChange={setSummary} 
            onEditClick={() => {
              setSummary(autoSummary);
              setSummaryEdited(true);
            }} 
          />

          <BillingSummary 
            hasBilling={hasBilling}
            billItems={existingBilling?.payment?.billItems || []}
            totalAmount={billingTotal}
            discount={billingDiscount}
            status={billingStatus}
          />

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Medico-legal notice:</strong> Once completed, this consultation record is
              locked and cannot be edited. Ensure all information is accurate.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          {isProcedure ? (
            <>
              <Button
                onClick={() => handleSubmit('complete')}
                disabled={!isValid || isSubmitting}
                variant="outline"
                className="gap-1.5"
              >
                {isSubmitting && actionChoice === 'complete' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Finish & Exit
              </Button>
              <Button
                onClick={() => handleSubmit('plan')}
                disabled={!isValid || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {isSubmitting && actionChoice === 'plan' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Complete & Plan Surgery
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleSubmit('complete')}
              disabled={!isValid || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 min-w-[140px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isFollowUp ? 'Complete & Schedule' : 'Complete Consultation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
