'use client';

/**
 * Complete Consultation Dialog — Review & Confirm
 * 
 * This dialog is a CONFIRMATION step, not a data-entry step.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import { completeSession } from '@/actions/doctor/consultation-session';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

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
  assessment?: string;
  plan?: string;
}): string {
  const parts: string[] = [];

  const subjective = notes.chiefComplaint ? stripHtml(notes.chiefComplaint) : '';
  const objective = notes.examination ? stripHtml(notes.examination) : '';
  const assessment = notes.assessment ? stripHtml(notes.assessment) : '';
  const plan = notes.plan ? stripHtml(notes.plan) : '';

  if (subjective) parts.push(`Subjective: ${subjective}`);
  if (objective) parts.push(`Objective: ${objective}`);
  if (assessment) parts.push(`Assessment: ${assessment}`);
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
  const router = useRouter();
  const docs = useDocumentationContext();
  const { setPatientDecision } = docs;

  // Summary logic
  const autoSummary = useMemo(() => generateSummary(docs.notes), [docs.notes]);
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
  const hasChief = !!docs.notes.chiefComplaint && stripHtml(docs.notes.chiefComplaint).length > 0;
  const hasExam = !!docs.notes.examination && stripHtml(docs.notes.examination).length > 0;
  const hasAssessment = !!docs.notes.assessment && stripHtml(docs.notes.assessment).length > 0;
  const hasPlan = !!docs.notes.plan && stripHtml(docs.notes.plan).length > 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const result = await completeSession(appointment.id);

      if (result.success) {
        toast.success('Consultation documentation finalized');
        router.push(result.data.redirectPath || '/doctor/consultations');
        onClose();
      } else {
        toast.error(result.error?.message || 'Failed to complete consultation');
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
            hasAssessment={hasAssessment}
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
