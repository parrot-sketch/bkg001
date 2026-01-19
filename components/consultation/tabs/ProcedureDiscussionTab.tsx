'use client';

/**
 * Procedure Discussion Tab
 * 
 * Document procedure options discussed, patient questions, and decision status.
 * Critical for aesthetic surgery: tracks patient decision journey.
 */

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { PatientDecision } from '@/domain/enums/PatientDecision';

interface ProcedureDiscussionTabProps {
  consultation: ConsultationResponseDto | null;
  isReadOnly?: boolean;
}

export function ProcedureDiscussionTab({
  consultation,
  isReadOnly = false,
}: ProcedureDiscussionTabProps) {
  const [discussion, setDiscussion] = useState('');
  const [patientDecision, setPatientDecision] = useState<PatientDecision | ''>(
    consultation?.patientDecision || ''
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="procedure-discussion" className="text-sm font-medium">
          Procedure Discussion
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Document procedures discussed, options presented, and patient questions.
        </p>
        <Textarea
          id="procedure-discussion"
          placeholder="Procedures discussed, options presented, risks explained, patient questions..."
          value={discussion}
          onChange={(e) => setDiscussion(e.target.value)}
          disabled={isReadOnly}
          rows={12}
          className="font-mono text-sm resize-none"
        />
      </div>

      {consultation?.outcomeType === 'PROCEDURE_RECOMMENDED' && (
        <div>
          <Label htmlFor="patient-decision" className="text-sm font-medium">
            Patient Decision
          </Label>
          <Select
            value={patientDecision}
            onValueChange={(value) => setPatientDecision(value as PatientDecision)}
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
    </div>
  );
}
