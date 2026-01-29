'use client';

/**
 * Recommendations Tab
 * 
 * Consultation outcome and recommendations.
 * Critical for aesthetic surgery: determines next workflow path.
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';

interface RecommendationsTabProps {
  consultation: ConsultationResponseDto | null;
  onOutcomeChange?: (outcomeType: ConsultationOutcomeType) => void;
  onAssessmentChange?: (assessment: string) => void;
  onPlanChange?: (plan: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  isReadOnly?: boolean;
}

export function RecommendationsTab({
  consultation,
  onOutcomeChange,
  onAssessmentChange,
  onPlanChange,
  onSave,
  isSaving = false,
  isReadOnly = false,
}: RecommendationsTabProps) {
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | ''>(
    consultation?.outcomeType || ''
  );
  const [assessment, setAssessment] = useState(
    consultation?.notes?.structured?.assessment || ''
  );
  const [plan, setPlan] = useState(
    consultation?.notes?.structured?.plan || ''
  );

  useEffect(() => {
    if (consultation?.notes?.structured) {
      setAssessment(consultation.notes.structured.assessment || '');
      setPlan(consultation.notes.structured.plan || '');
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

  const handlePlanChange = (value: string) => {
    setPlan(value);
    onPlanChange?.(value);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="outcome-type" className="text-sm font-medium">
          Consultation Outcome *
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Select the outcome type to determine next workflow steps.
        </p>
        <Select
          value={outcomeType}
          onValueChange={(value) => handleOutcomeChange(value as ConsultationOutcomeType)}
          disabled={isReadOnly}
        >
          <SelectTrigger id="outcome-type" className="mt-2">
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

      <div>
        <Label htmlFor="assessment" className="text-sm font-medium">
          Assessment
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Clinical assessment and findings summary.
        </p>
        <RichTextEditor
          content={assessment}
          onChange={handleAssessmentChange}
          placeholder="Clinical assessment, findings summary, diagnosis..."
          readOnly={isReadOnly}
          minHeight="250px"
        />
      </div>

      <div>
        <Label htmlFor="plan" className="text-sm font-medium">
          Plan
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Treatment plan and recommendations.
        </p>
        <RichTextEditor
          content={plan}
          onChange={handlePlanChange}
          placeholder="Treatment plan, recommendations, next steps..."
          readOnly={isReadOnly}
          minHeight="250px"
        />
      </div>

      {/* Save Button */}
      {!isReadOnly && onSave && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || (!outcomeType && !assessment.trim() && !plan.trim())}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Assessment & Plan'}
          </Button>
        </div>
      )}
    </div>
  );
}
