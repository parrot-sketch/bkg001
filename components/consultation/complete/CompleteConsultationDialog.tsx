'use client';

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
import { Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import { useBillingContext } from '@/providers/billing/BillingProvider';
import { useAppointmentBilling } from '@/hooks/doctor/useBilling';
import { completeSession } from '@/actions/doctor/consultation-session';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

// Sub-components
import { DocumentationStep } from './DocumentationStep';
import { FollowUpStep } from './FollowUpStep';
import { BillingStep } from './BillingStep';
import { ReviewStep } from './ReviewStep';

const STEPS = [
  { key: 'documentation', label: 'Documentation' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'billing', label: 'Billing' },
  { key: 'review', label: 'Review' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

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
  const router = useRouter();
  const docs = useDocumentationContext();
  const billing = useBillingContext();
  const { data: existingBilling } = useAppointmentBilling(appointment.id, open);

  const [currentStep, setCurrentStep] = useState<StepKey>('documentation');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [summary, setSummary] = useState('');
  const [summaryEdited, setSummaryEdited] = useState(false);

  const [followUp, setFollowUp] = useState<{
    followUpDate?: Date;
    followUpTime?: string;
    followUpType?: string;
  }>({});

  const autoSummary = useMemo(() => {
    const notes = docs.notes;
    const parts: string[] = [];
    if (notes.chiefComplaint) parts.push(`Subjective: ${notes.chiefComplaint.replace(/<[^>]*>/g, '').trim()}`);
    if (notes.examination) parts.push(`Objective: ${notes.examination.replace(/<[^>]*>/g, '').trim()}`);
    if (notes.assessment) parts.push(`Assessment: ${notes.assessment.replace(/<[^>]*>/g, '').trim()}`);
    if (notes.plan) parts.push(`Plan: ${notes.plan.replace(/<[^>]*>/g, '').trim()}`);
    return parts.join('\n\n');
  }, [docs.notes]);

  const effectiveSummary = summaryEdited ? summary : autoSummary;

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const canProceed = useMemo(() => {
    if (currentStep === 'documentation') {
      return effectiveSummary.trim().length > 0;
    }
    if (currentStep === 'followup') {
      return true; // optional
    }
    if (currentStep === 'billing') {
      return true; // optional, defaults to consultation fee
    }
    return true;
  }, [currentStep, effectiveSummary]);

  const handleNext = () => {
    if (!canProceed) {
      toast.error('Please complete the current step before continuing');
      return;
    }
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(STEPS[currentStepIndex + 1].key);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].key);
    }
  };

  const handleSubmit = async () => {
    if (!effectiveSummary.trim()) {
      toast.error('Please provide a consultation summary');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeSession(consultation.id);

      if (result.success) {
        toast.success('Consultation completed successfully');
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

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0 rounded-xl border border-[#e7d6bf] bg-white shadow-lg">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-base font-semibold text-[#2c2e4b]">
            Complete Consultation
          </DialogTitle>
          <DialogDescription className="text-xs text-[#2c2e4b]/60">
            Finalize documentation, schedule follow-up, and review billing.
          </DialogDescription>

          {/* Step Indicators */}
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <div
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    index <= currentStepIndex ? 'bg-[#caa26a]' : 'bg-[#e7d6bf]'
                  )}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            {STEPS.map((step, index) => (
              <button
                key={step.key}
                type="button"
                onClick={() => index <= currentStepIndex && setCurrentStep(step.key)}
                disabled={index > currentStepIndex}
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  index === currentStepIndex
                    ? 'text-[#2c2e4b]'
                    : index < currentStepIndex
                      ? 'text-[#caa26a] cursor-pointer hover:text-[#b8913e]'
                      : 'text-[#2c2e4b]/30 cursor-not-allowed'
                )}
              >
                {step.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {currentStep === 'documentation' && (
            <DocumentationStep
              autoSummary={autoSummary}
              summary={summary}
              summaryEdited={summaryEdited}
              onSummaryChange={setSummary}
              onEditClick={() => {
                setSummary(autoSummary);
                setSummaryEdited(true);
              }}
            />
          )}

          {currentStep === 'followup' && (
            <FollowUpStep
              appointmentType={appointment.type}
              onChange={setFollowUp}
            />
          )}

          {currentStep === 'billing' && (
            <BillingStep
              appointmentId={appointment.id}
              existingBilling={existingBilling}
              onChange={billing.setBillingItems}
              onTotalChange={billing.setBillingTotal}
              onDiscountChange={billing.setDiscount}
            />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              summary={effectiveSummary}
              followUp={followUp}
              billingItems={billing.billingItems}
              billingTotal={billing.billingTotal}
              discount={billing.discount}
            />
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[#e7d6bf] shrink-0 gap-2 bg-white">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isSubmitting}
            className="text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={isSubmitting || !canProceed}
            className="h-9 rounded-lg bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-medium shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : isLastStep ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Consultation
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
