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
import { useAppointmentBilling } from '@/hooks/doctor/useBilling';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { CompleteConsultationDto } from '@/application/dtos/CompleteConsultationDto';

// Sub-components
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
  const { state, setPatientDecision } = useConsultationContext();

  // Summary logic
  const autoSummary = useMemo(() => generateSummary(state.notes), [state.notes]);
  const [summary, setSummary] = useState('');
  const [summaryEdited, setSummaryEdited] = useState(false);
  const effectiveSummary = summaryEdited ? summary : autoSummary;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Billing data (read-only)
  const { data: existingBilling } = useAppointmentBilling(appointment.id, open);
  const hasBilling = !!existingBilling?.payment?.billItems?.length;
  const billingTotal = existingBilling?.payment?.totalAmount ?? 0;
  const billingDiscount = existingBilling?.payment?.discount ?? 0;
  const billingStatus = existingBilling?.payment?.status;

  // Validation
  const missingSummary = !effectiveSummary.trim();

  const validationErrors: string[] = [];
  if (missingSummary) validationErrors.push('No notes documented — at least one section is required');

  const isValid = validationErrors.length === 0;

  // Notes completeness check
  const hasChief = !!state.notes.chiefComplaint && stripHtml(state.notes.chiefComplaint).length > 0;
  const hasExam = !!state.notes.examination && stripHtml(state.notes.examination).length > 0;
  const hasPlan = !!state.notes.plan && stripHtml(state.notes.plan).length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const dto: CompleteConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        outcome: effectiveSummary.trim(),
        // OutcomeType is now optional
      };

      const response = await doctorApi.completeConsultation(dto);

      if (response.success) {
        toast.success('Consultation documentation finalized');
        onSuccess(); // Context handles redirect to /doctor/consultations
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Finalize Documentation
          </DialogTitle>
          <DialogDescription>
            Confirm your notes are complete. You can select follow-up actions in the Consultations Hub.
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Notice:</strong> Once finalized, this clinical record will be locked. 
              Surgical planning, follow-up scheduling, and billing finalization are available in the hub.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Continue Editing
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 min-w-[140px]"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Finish & Exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
