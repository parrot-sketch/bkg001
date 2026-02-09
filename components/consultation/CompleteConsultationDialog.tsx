'use client';

/**
 * Complete Consultation Dialog
 * 
 * Medico-legally critical: Finalizes consultation with required outcome and summary.
 * Enforces validation: outcome type and summary are required.
 * 
 * Billing is READ-ONLY here. The BillingTab in the consultation workspace is the
 * single source of truth for billing items. This dialog shows a summary of what's
 * been billed (if anything) and delegates to the use case's default fallback
 * (doctor's consultation fee) when no billing exists.
 * 
 * Designed for clinical safety: clear warnings, no accidental completion.
 */

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Receipt, CheckCircle, Info } from 'lucide-react';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { useAppointmentBilling } from '@/hooks/doctor/useBilling';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { CompleteConsultationDto } from '@/application/dtos/CompleteConsultationDto';

interface CompleteConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (redirectPath?: string) => void;
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

  // Read-only billing data — the BillingTab is the sole editor
  const { data: existingBilling } = useAppointmentBilling(appointment.id, open);

  const hasBilling = existingBilling?.payment?.billItems && existingBilling.payment.billItems.length > 0;
  const billingTotal = existingBilling?.payment?.totalAmount ?? 0;
  const billingDiscount = existingBilling?.payment?.discount ?? 0;
  const billingStatus = existingBilling?.payment?.status;

  // Validation
  const isValid = outcomeType !== '' && summary.trim().length > 0;
  const requiresPatientDecision = outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;
  const isValidWithDecision = isValid && (!requiresPatientDecision || patientDecision !== '');

  const isFollowUp = outcomeType === ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED;
  const isProcedure = outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;

  const [actionChoice, setActionChoice] = useState<'complete' | 'plan' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidWithDecision) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // No billing items sent from dialog — the BillingTab is the single source of truth.
      // The use case will:
      // 1. Use existing billing (from BillingTab) if it exists
      // 2. Fall back to the doctor's consultation fee if no billing was saved
      const dto: CompleteConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        outcome: summary.trim(),
        outcomeType: outcomeType as ConsultationOutcomeType,
        patientDecision: requiresPatientDecision ? (patientDecision as PatientDecision) : undefined,
      };

      const response = await doctorApi.completeConsultation(dto);

      if (response.success) {
        if (isProcedure) {
          toast.success('Consultation completed. Patient added to surgery waiting list.');

          if (actionChoice === 'plan') {
            const operativeUrl = `/doctor/operative/plan/${appointment.id}/new`;
            onSuccess(operativeUrl);
          } else {
            onSuccess();
          }
        }
        else if (isFollowUp) {
          toast.success('Consultation completed. Redirecting to schedule follow-up...');
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
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Include: Chief complaint, examination, assessment, and plan
              </p>
            </div>

            {/* Billing Summary — Read-Only */}
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Billing Summary
              </Label>

              {hasBilling ? (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  {/* Itemized list */}
                  <div className="space-y-1">
                    {existingBilling!.payment!.billItems.map((item) => (
                      <div
                        key={item.serviceId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{item.serviceName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {item.quantity} × {item.unitCost.toLocaleString()}
                          </span>
                          <span className="font-medium w-20 text-right">
                            {item.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    {billingDiscount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Discount: -{billingDiscount.toLocaleString()}
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="font-bold">Total:</span>
                      <Badge variant="secondary" className="text-xs font-bold">
                        {billingTotal.toLocaleString()}
                      </Badge>
                      {billingStatus === 'PAID' && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    No billing items were added during this consultation.
                    The doctor&apos;s default consultation fee will be applied automatically.
                    To add specific services, use the <strong>Billing tab</strong> before completing.
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {isProcedure ? (
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!isValidWithDecision || isSubmitting}
                  onClick={() => setActionChoice('complete')}
                  className="bg-slate-800 text-white min-w-[120px]"
                >
                  {isSubmitting && actionChoice === 'complete' ? 'Completing...' : 'Finish & Exit'}
                </Button>
                <Button
                  type="submit"
                  disabled={!isValidWithDecision || isSubmitting}
                  onClick={() => setActionChoice('plan')}
                  className="bg-primary text-primary-foreground min-w-[120px] gap-2"
                >
                  {isSubmitting && actionChoice === 'plan' ? 'Redirecting...' : 'Plan Surgery Now'}
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={!isValidWithDecision || isSubmitting}
                className="bg-primary text-primary-foreground min-w-[120px]"
              >
                {isSubmitting ? 'Completing...' : (isFollowUp ? 'Complete & Schedule' : 'Complete Consultation')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
