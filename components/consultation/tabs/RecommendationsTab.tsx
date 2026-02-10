'use client';

/**
 * Assessment Tab
 * 
 * Clinical assessment, consultation outcome, and patient decision.
 * This is the single source of truth for:
 * - Outcome type (determines downstream workflow)
 * - Patient decision (if procedure recommended)
 * - Assessment notes
 * 
 * The Complete dialog will READ these values — not ask again.
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import {
  ClipboardCheck,
  ArrowRight,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// PROPS
// ============================================================================

interface RecommendationsTabProps {
  consultation: ConsultationResponseDto | null;
  /** Current outcome from context (source of truth) */
  currentOutcome?: ConsultationOutcomeType | null;
  /** Current patient decision from context (source of truth) */
  currentPatientDecision?: PatientDecision | null;
  onOutcomeChange?: (outcomeType: ConsultationOutcomeType) => void;
  onPatientDecisionChange?: (decision: PatientDecision) => void;
  onAssessmentChange?: (assessment: string) => void;
  isReadOnly?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OUTCOME_OPTIONS = [
  {
    value: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
    label: 'Procedure Recommended',
    description: 'Patient is a candidate for a procedure',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    value: ConsultationOutcomeType.CONSULTATION_ONLY,
    label: 'Consultation Only',
    description: 'No procedure — informational session',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
  },
  {
    value: ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED,
    label: 'Follow-Up Needed',
    description: 'Schedule additional consultation',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    value: ConsultationOutcomeType.PATIENT_DECIDING,
    label: 'Patient Deciding',
    description: 'Patient needs time to decide',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    value: ConsultationOutcomeType.REFERRAL_NEEDED,
    label: 'Referral Needed',
    description: 'Refer to another specialist',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
  },
];

const PATIENT_DECISION_OPTIONS = [
  {
    value: PatientDecision.YES,
    label: 'Yes — Proceed with Procedure',
    description: 'Patient consents to the recommended procedure',
  },
  {
    value: PatientDecision.NO,
    label: 'No — Decline Procedure',
    description: 'Patient declines the procedure at this time',
  },
  {
    value: PatientDecision.PENDING,
    label: 'Pending — Needs Time to Decide',
    description: 'Patient wants time to consider',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function RecommendationsTab({
  consultation,
  currentOutcome,
  currentPatientDecision,
  onOutcomeChange,
  onPatientDecisionChange,
  onAssessmentChange,
  isReadOnly = false,
}: RecommendationsTabProps) {
  // Initialize from context state, then fallback to consultation data
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | ''>(
    currentOutcome || consultation?.outcomeType || ''
  );
  const [patientDecision, setPatientDecision] = useState<PatientDecision | ''>(
    currentPatientDecision || consultation?.patientDecision || ''
  );
  const [assessment, setAssessment] = useState(
    consultation?.notes?.structured?.assessment || ''
  );

  // Sync from consultation data on load
  useEffect(() => {
    if (consultation?.notes?.structured) {
      setAssessment(consultation.notes.structured.assessment || '');
    }
  }, [consultation]);

  // Sync outcome from context if it changes externally
  useEffect(() => {
    if (currentOutcome && currentOutcome !== outcomeType) {
      setOutcomeType(currentOutcome);
    }
  }, [currentOutcome]);

  // Sync patient decision from context if it changes externally
  useEffect(() => {
    if (currentPatientDecision && currentPatientDecision !== patientDecision) {
      setPatientDecision(currentPatientDecision);
    }
  }, [currentPatientDecision]);

  const handleOutcomeChange = (value: ConsultationOutcomeType) => {
    setOutcomeType(value);
    onOutcomeChange?.(value);

    // Clear patient decision if outcome changes away from PROCEDURE_RECOMMENDED
    if (value !== ConsultationOutcomeType.PROCEDURE_RECOMMENDED) {
      setPatientDecision('');
    }
  };

  const handlePatientDecisionChange = (value: PatientDecision) => {
    setPatientDecision(value);
    onPatientDecisionChange?.(value);
  };

  const handleAssessmentChange = (value: string) => {
    setAssessment(value);
    onAssessmentChange?.(value);
  };

  const isProcedure = outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;
  const selectedOutcomeOption = OUTCOME_OPTIONS.find(o => o.value === outcomeType);

  return (
    <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Clinical Assessment</h2>
        </div>
        <p className="text-xs text-slate-500 ml-6">
          Document your assessment and determine the consultation outcome. This drives the next
          steps in the workflow.
        </p>
      </div>

      {/* ─── Outcome Selection ─── */}
      <div className={cn(
        'rounded-xl border p-4 space-y-3 transition-colors',
        selectedOutcomeOption
          ? selectedOutcomeOption.color
          : 'border-slate-200 bg-slate-50/50',
      )}>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-3.5 w-3.5 opacity-60" />
          <Label htmlFor="outcome-type" className="text-xs font-semibold">
            Consultation Outcome <span className="text-red-500">*</span>
          </Label>
        </div>
        <Select
          value={outcomeType}
          onValueChange={(value) => handleOutcomeChange(value as ConsultationOutcomeType)}
          disabled={isReadOnly}
        >
          <SelectTrigger id="outcome-type" className="bg-white border-slate-200">
            <SelectValue placeholder="Select outcome type…" />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-slate-400 hidden sm:inline">— {option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Outcome hint */}
        {outcomeType === ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED && (
          <p className="text-xs opacity-80 flex items-center gap-1.5 ml-0.5">
            <AlertCircle className="h-3 w-3" />
            You&apos;ll be prompted to schedule a follow-up after completing.
          </p>
        )}
      </div>

      {/* ─── Patient Decision (only for Procedure Recommended) ─── */}
      {isProcedure && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
            <Label htmlFor="patient-decision" className="text-xs font-semibold text-blue-800">
              Patient Decision <span className="text-red-500">*</span>
            </Label>
          </div>
          <p className="text-xs text-blue-600 ml-5.5">
            Did the patient agree to proceed with the recommended procedure?
          </p>
          <Select
            value={patientDecision}
            onValueChange={(value) => handlePatientDecisionChange(value as PatientDecision)}
            disabled={isReadOnly}
          >
            <SelectTrigger id="patient-decision" className="bg-white border-blue-200">
              <SelectValue placeholder="Select patient's decision…" />
            </SelectTrigger>
            <SelectContent>
              {PATIENT_DECISION_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Decision context hints */}
          {patientDecision === PatientDecision.YES && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Patient will be added to the surgical waiting list. You can plan the surgery after
              completing this consultation.
            </p>
          )}
          {patientDecision === PatientDecision.PENDING && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              A case plan will be created with &quot;pending decision&quot; status. Patient can confirm later.
            </p>
          )}
        </div>
      )}

      {/* ─── Assessment Notes ─── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-xs font-semibold text-slate-700">Assessment Notes</Label>
        </div>
        <RichTextEditor
          content={assessment}
          onChange={handleAssessmentChange}
          placeholder="Clinical assessment, findings summary, diagnosis, candidacy evaluation…"
          readOnly={isReadOnly}
          minHeight="300px"
        />
      </div>
    </div>
  );
}
