'use client';

/**
 * Assessment Tab
 * 
 * Clinical assessment and consultation outcome selection.
 * Single responsibility: outcome type + assessment notes.
 * 
 * The treatment plan is handled by the dedicated TreatmentPlanTab,
 * ensuring each tab owns exactly one note field (SRP).
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';

interface RecommendationsTabProps {
  consultation: ConsultationResponseDto | null;
  onOutcomeChange?: (outcomeType: ConsultationOutcomeType) => void;
  onAssessmentChange?: (assessment: string) => void;
  isReadOnly?: boolean;
}

export function RecommendationsTab({
  consultation,
  onOutcomeChange,
  onAssessmentChange,
  isReadOnly = false,
}: RecommendationsTabProps) {
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | ''>(
    consultation?.outcomeType || ''
  );
  const [assessment, setAssessment] = useState(
    consultation?.notes?.structured?.assessment || ''
  );

  useEffect(() => {
    if (consultation?.notes?.structured) {
      setAssessment(consultation.notes.structured.assessment || '');
    }
  }, [consultation]);

  const handleOutcomeChange = (value: ConsultationOutcomeType) => {
    setOutcomeType(value);
    onOutcomeChange?.(value);
  };

  const handleAssessmentChange = (value: string) => {
    setAssessment(value);
    onAssessmentChange?.(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Consultation Outcome */}
      <div>
        <Label htmlFor="outcome-type" className="text-sm font-semibold">
          Consultation Outcome
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Select the outcome type to determine next workflow steps.
        </p>
        <Select
          value={outcomeType}
          onValueChange={(value) => handleOutcomeChange(value as ConsultationOutcomeType)}
          disabled={isReadOnly}
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

      {/* Clinical Assessment */}
      <div>
        <Label htmlFor="assessment" className="text-sm font-semibold">
          Clinical Assessment
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Document your clinical assessment, findings summary, and diagnosis.
        </p>
        <RichTextEditor
          content={assessment}
          onChange={handleAssessmentChange}
          placeholder="Clinical assessment, findings summary, diagnosis..."
          readOnly={isReadOnly}
          minHeight="400px"
        />
      </div>
    </div>
  );
}
