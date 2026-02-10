'use client';

/**
 * Complete Consultation Dialog — Review & Confirm
 * 
 * This dialog is a CONFIRMATION step, not a data-entry step.
 * 
 * All clinical data (outcome type, patient decision, notes) has already been
 * captured in the workspace tabs. This dialog:
 * 
 * 1. Shows a review of what was documented
 * 2. Auto-generates a summary from structured notes
 * 3. Validates all required fields are set
 * 4. Shows billing summary (read-only)
 * 5. Provides appropriate CTA based on outcome type
 * 
 * Medico-legal: Once completed, the consultation is locked.
 */

import { useState, useMemo } from 'react';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Receipt,
  CheckCircle,
  CheckCircle2,
  Info,
  FileText,
  Stethoscope,
  ClipboardCheck,
  CalendarPlus,
  UserCheck,
  ArrowRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { useAppointmentBilling } from '@/hooks/doctor/useBilling';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { CompleteConsultationDto } from '@/application/dtos/CompleteConsultationDto';
import { cn } from '@/lib/utils';

// ============================================================================
// PROPS
// ============================================================================

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

function getOutcomeLabel(type: ConsultationOutcomeType): string {
  const labels: Record<ConsultationOutcomeType, string> = {
    [ConsultationOutcomeType.PROCEDURE_RECOMMENDED]: 'Procedure Recommended',
    [ConsultationOutcomeType.CONSULTATION_ONLY]: 'Consultation Only',
    [ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED]: 'Follow-Up Needed',
    [ConsultationOutcomeType.PATIENT_DECIDING]: 'Patient Deciding',
    [ConsultationOutcomeType.REFERRAL_NEEDED]: 'Referral Needed',
  };
  return labels[type] || type;
}

function getDecisionLabel(decision: PatientDecision): string {
  const labels: Record<PatientDecision, string> = {
    [PatientDecision.YES]: 'Yes — Proceed',
    [PatientDecision.NO]: 'No — Decline',
    [PatientDecision.PENDING]: 'Pending — Deciding',
  };
  return labels[decision] || decision;
}

function getOutcomeColor(type: ConsultationOutcomeType): string {
  const colors: Record<ConsultationOutcomeType, string> = {
    [ConsultationOutcomeType.PROCEDURE_RECOMMENDED]: 'bg-blue-50 text-blue-700 border-blue-200',
    [ConsultationOutcomeType.CONSULTATION_ONLY]: 'bg-slate-50 text-slate-700 border-slate-200',
    [ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED]: 'bg-amber-50 text-amber-700 border-amber-200',
    [ConsultationOutcomeType.PATIENT_DECIDING]: 'bg-purple-50 text-purple-700 border-purple-200',
    [ConsultationOutcomeType.REFERRAL_NEEDED]: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return colors[type] || '';
}

/**
 * Generate a clean summary from structured notes.
 * This is what gets saved as the `outcome` field.
 */
function generateSummary(notes: {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}): string {
  const parts: string[] = [];

  const chief = notes.chiefComplaint ? stripHtml(notes.chiefComplaint) : '';
  const exam = notes.examination ? stripHtml(notes.examination) : '';
  const assess = notes.assessment ? stripHtml(notes.assessment) : '';
  const plan = notes.plan ? stripHtml(notes.plan) : '';

  if (chief) parts.push(`Chief Complaint: ${chief}`);
  if (exam) parts.push(`Examination: ${exam}`);
  if (assess) parts.push(`Assessment: ${assess}`);
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
  const { state } = useConsultationContext();

  // Read outcome & decision from context (set in Assessment tab)
  const outcomeType = state.outcomeType;
  const patientDecision = state.patientDecision;

  // Auto-generate summary from structured notes
  const autoSummary = useMemo(
    () => generateSummary(state.notes),
    [state.notes],
  );

  // Allow doctor to optionally edit the summary
  const [summary, setSummary] = useState('');
  const [summaryEdited, setSummaryEdited] = useState(false);
  const effectiveSummary = summaryEdited ? summary : autoSummary;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionChoice, setActionChoice] = useState<'complete' | 'plan' | null>(null);

  // Billing data (read-only)
  const { data: existingBilling } = useAppointmentBilling(appointment.id, open);
  const hasBilling = existingBilling?.payment?.billItems && existingBilling.payment.billItems.length > 0;
  const billingTotal = existingBilling?.payment?.totalAmount ?? 0;
  const billingDiscount = existingBilling?.payment?.discount ?? 0;
  const billingStatus = existingBilling?.payment?.status;

  // ─── Validation ───
  const isProcedure = outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;
  const isFollowUp = outcomeType === ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED;

  const missingOutcome = !outcomeType;
  const missingDecision = isProcedure && !patientDecision;
  const missingSummary = !effectiveSummary.trim();

  const validationErrors: string[] = [];
  if (missingOutcome) validationErrors.push('Consultation outcome not selected (go to Assessment tab)');
  if (missingDecision) validationErrors.push('Patient decision not selected (go to Assessment tab)');
  if (missingSummary) validationErrors.push('No notes documented — at least one section is required');

  const isValid = validationErrors.length === 0;

  // ─── Notes completeness check ───
  const hasChief = !!state.notes.chiefComplaint && stripHtml(state.notes.chiefComplaint).length > 0;
  const hasExam = !!state.notes.examination && stripHtml(state.notes.examination).length > 0;
  const hasAssessment = !!state.notes.assessment && stripHtml(state.notes.assessment).length > 0;
  const hasPlan = !!state.notes.plan && stripHtml(state.notes.plan).length > 0;

  // ─── Submit ───
  const handleSubmit = async (choice: 'complete' | 'plan') => {
    if (!isValid || !outcomeType) return;

    setActionChoice(choice);
    setIsSubmitting(true);

    try {
      const dto: CompleteConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        outcome: effectiveSummary.trim(),
        outcomeType,
        patientDecision: isProcedure ? (patientDecision ?? undefined) : undefined,
      };

      const response = await doctorApi.completeConsultation(dto);

      if (response.success) {
        if (isProcedure) {
          toast.success('Consultation completed. Patient added to surgery waiting list.');
          if (choice === 'plan') {
            const operativeUrl = `/doctor/operative/plan/${appointment.id}/new`;
            onSuccess(operativeUrl);
          } else {
            onSuccess();
          }
        } else if (isFollowUp) {
          toast.success('Consultation completed. Redirecting to schedule follow-up…');
          const bookingUrl = `/doctor/appointments/new?patientId=${appointment.patientId}&type=Follow-up`;
          onSuccess(bookingUrl);
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
          {/* ─── Validation Errors ─── */}
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

          {/* ─── Outcome & Decision Review ─── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Consultation Outcome
            </h3>

            {outcomeType ? (
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className={cn('text-sm font-medium px-3 py-1', getOutcomeColor(outcomeType))}
                >
                  {getOutcomeLabel(outcomeType)}
                </Badge>

                {isProcedure && patientDecision && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span className="text-slate-600">Patient Decision:</span>
                    <span className="font-medium text-slate-900">
                      {getDecisionLabel(patientDecision)}
                    </span>
                  </div>
                )}

                {isFollowUp && (
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3" />
                    You&apos;ll be redirected to schedule a follow-up appointment.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-600 font-medium">
                ⚠ No outcome selected — go to the Assessment tab first.
              </p>
            )}
          </div>

          {/* ─── Documentation Checklist ─── */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Documentation Review
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <ChecklistItem icon={FileText} label="Chief Complaint" complete={hasChief} />
              <ChecklistItem icon={Stethoscope} label="Examination" complete={hasExam} />
              <ChecklistItem icon={ClipboardCheck} label="Assessment" complete={hasAssessment} />
              <ChecklistItem icon={CalendarPlus} label="Treatment Plan" complete={hasPlan} />
            </div>
          </div>

          {/* ─── Summary (auto-generated, optionally editable) ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Consultation Summary
              </Label>
              {!summaryEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setSummary(autoSummary);
                    setSummaryEdited(true);
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit summary
                </button>
              )}
            </div>

            {summaryEdited ? (
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={5}
                className="text-sm font-mono"
                placeholder="Consultation summary…"
              />
            ) : (
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {autoSummary || (
                  <span className="text-slate-400 italic">No notes documented yet.</span>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Auto-generated from your structured notes. Click &quot;Edit&quot; to customize.
            </p>
          </div>

          {/* ─── Billing Summary (read-only) ─── */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Billing
            </h3>

            {hasBilling ? (
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <div className="space-y-1">
                  {existingBilling!.payment!.billItems.map((item) => (
                    <div key={item.serviceId} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{item.serviceName}</span>
                      <span className="font-medium text-slate-900">
                        KSH {item.totalCost.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                  {billingDiscount > 0 && (
                    <span className="text-xs text-slate-400">
                      Discount: - KSH {billingDiscount.toLocaleString()}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="font-bold text-slate-700">Total:</span>
                    <span className="font-bold text-slate-900">
                      KSH {billingTotal.toLocaleString()}
                    </span>
                    {billingStatus === 'PAID' && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-0.5" />
                        Paid
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  No billing items added. The doctor&apos;s default consultation fee will be applied.
                </span>
              </div>
            )}
          </div>

          {/* ─── Medico-legal warning ─── */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Medico-legal notice:</strong> Once completed, this consultation record is
              locked and cannot be edited. Ensure all information is accurate.
            </p>
          </div>
        </div>

        {/* ─── Actions ─── */}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {isProcedure && patientDecision === PatientDecision.YES ? (
            // Procedure flow: two CTA options
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
            // Standard flow: single CTA
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ChecklistItem({
  icon: Icon,
  label,
  complete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  complete: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors',
      complete
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-slate-50 text-slate-400',
    )}>
      {complete ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      <span className={cn('font-medium', complete ? '' : 'font-normal')}>
        {label}
      </span>
    </div>
  );
}
