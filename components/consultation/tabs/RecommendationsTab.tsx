'use client';

/**
 * Recommendations Tab
 * 
 * Consultation outcome and recommendations.
 * Critical for aesthetic surgery: determines next workflow path.
 */

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';

interface RecommendationsTabProps {
  consultation: ConsultationResponseDto | null;
  isReadOnly?: boolean;
}

export function RecommendationsTab({
  consultation,
  isReadOnly = false,
}: RecommendationsTabProps) {
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | ''>(
    consultation?.outcomeType || ''
  );
  const [recommendations, setRecommendations] = useState('');

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
          onValueChange={(value) => setOutcomeType(value as ConsultationOutcomeType)}
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
        <Label htmlFor="recommendations" className="text-sm font-medium">
          Recommendations & Plan
        </Label>
        <Textarea
          id="recommendations"
          placeholder="Detailed recommendations, treatment plan, next steps..."
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          disabled={isReadOnly}
          rows={12}
          className="font-mono text-sm resize-none mt-2"
        />
      </div>
    </div>
  );
}
