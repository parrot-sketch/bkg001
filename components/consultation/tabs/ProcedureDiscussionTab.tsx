'use client';

/**
 * Procedure Discussion Tab
 * 
 * Document procedure options discussed, patient questions, and decision status.
 * Critical for aesthetic surgery: tracks patient decision journey.
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { PatientDecision } from '@/domain/enums/PatientDecision';

interface ProcedureDiscussionTabProps {
  consultation: ConsultationResponseDto | null;
  discussionContent?: string;
  onDiscussionChange?: (content: string) => void;
  onPatientDecisionChange?: (decision: PatientDecision) => void;
  onSave?: () => void;
  isSaving?: boolean;
  isReadOnly?: boolean;
}

export function ProcedureDiscussionTab({
  consultation,
  discussionContent = '',
  onDiscussionChange,
  onPatientDecisionChange,
  onSave,
  isSaving = false,
  isReadOnly = false,
}: ProcedureDiscussionTabProps) {
  const [patientDecision, setPatientDecision] = useState<PatientDecision | ''>(
    consultation?.patientDecision || ''
  );

  useEffect(() => {
    if (consultation?.patientDecision) {
      setPatientDecision(consultation.patientDecision);
    }
  }, [consultation]);

  const handleDecisionChange = (value: PatientDecision) => {
    setPatientDecision(value);
    onPatientDecisionChange?.(value);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="procedure-discussion" className="text-sm font-medium">
          Procedure Discussion
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Document procedures discussed, options presented, and patient questions.
        </p>
        <RichTextEditor
          content={discussionContent}
          onChange={(content) => onDiscussionChange?.(content)}
          placeholder="Procedures discussed, options presented, risks explained, patient questions..."
          readOnly={isReadOnly}
          minHeight="400px"
        />
      </div>

      {consultation?.outcomeType === 'PROCEDURE_RECOMMENDED' && (
        <div>
          <Label htmlFor="patient-decision" className="text-sm font-medium">
            Patient Decision
          </Label>
          <Select
            value={patientDecision}
            onValueChange={(value) => handleDecisionChange(value as PatientDecision)}
            disabled={isReadOnly}
          >
            <SelectTrigger id="patient-decision" className="mt-2">
              <SelectValue placeholder="Select decision" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PatientDecision.YES}>Yes - Proceed</SelectItem>
              <SelectItem value={PatientDecision.NO}>No - Decline</SelectItem>
              <SelectItem value={PatientDecision.PENDING}>Pending - Needs Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Save Button */}
      {!isReadOnly && onSave && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Discussion'}
          </Button>
        </div>
      )}
    </div>
  );
}
