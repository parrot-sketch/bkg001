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

  // Advisory warnings (non-blocking) — the doctor decides what's relevant
  const advisoryWarnings: string[] = [];
  if (missingSummary) advisoryWarnings.push('No clinical notes have been documented');
  if (!hasBilling) advisoryWarnings.push('No billing items recorded');

  const hasWarnings = advisoryWarnings.length > 0;

  // Notes completeness check
  const hasChief = !!state.notes.chiefComplaint && stripHtml(state.notes.chiefComplaint).length > 0;
  const hasExam = !!state.notes.examination && stripHtml(state.notes.examination).length > 0;
  const hasPlan = !!state.notes.plan && stripHtml(state.notes.plan).length > 0;

  const handleSubmit = async () => {
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
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Finalize documentation</DialogTitle>
          <DialogDescription>
            Review and confirm completion.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 min-h-0">
          {hasWarnings && (
            <div className="border border-slate-200 bg-white p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-900">Review</div>
              <ul className="space-y-1 ml-6">
                {advisoryWarnings.map((warning, i) => (
                  <li key={i} className="text-xs text-slate-700 list-disc">{warning}</li>
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

          <div className="p-3 border border-slate-200 bg-white">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Once finalized, this record is locked.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 shrink-0 gap-2 bg-white">
          <Button type="button" variant="outline" className="rounded-none" onClick={onClose} disabled={isSubmitting}>
            Continue Editing
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="outline"
            className="gap-1.5 min-w-[140px] rounded-none"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Finalize'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
