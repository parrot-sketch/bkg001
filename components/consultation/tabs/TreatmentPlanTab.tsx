'use client';

/**
 * Treatment Plan Tab
 * 
 * Single responsibility: treatment plan notes (`plan` field in StructuredNotes).
 * Also displays case plan links and follow-up information when available.
 * 
 * Note: Auto-saves via parent context — no per-tab save button needed.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

interface TreatmentPlanTabProps {
  consultation: ConsultationResponseDto | null;
  hasCasePlan: boolean;
  onPlanChange?: (plan: string) => void;
  isReadOnly?: boolean;
}

export function TreatmentPlanTab({
  consultation,
  hasCasePlan,
  onPlanChange,
  isReadOnly = false,
}: TreatmentPlanTabProps) {
  const [nextSteps, setNextSteps] = useState(
    consultation?.notes?.structured?.plan || ''
  );

  useEffect(() => {
    if (consultation?.notes?.structured?.plan) {
      setNextSteps(consultation.notes.structured.plan);
    }
  }, [consultation]);

  const handleChange = (value: string) => {
    setNextSteps(value);
    onPlanChange?.(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Case Plan Banner */}
      {hasCasePlan && consultation?.casePlanId && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Case Plan Created</span>
            </div>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                asChild
              >
                <Link href={`/doctor/case-plans/${consultation.casePlanId}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  View Case Plan
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Treatment Plan Editor */}
      <div>
        <Label htmlFor="next-steps" className="text-sm font-semibold">
          Treatment Plan & Next Steps
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Document treatment plan, timeline, pre-op requirements, and patient instructions.
        </p>
        <RichTextEditor
          content={nextSteps}
          onChange={handleChange}
          placeholder="Treatment plan, timeline, pre-op requirements, patient instructions..."
          readOnly={isReadOnly}
          minHeight="400px"
        />
      </div>

      {/* Follow-Up Info */}
      {consultation?.followUp && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Follow-Up Scheduled</span>
            </div>
            {consultation.followUp.date && (
              <div className="text-xs text-muted-foreground">
                {new Date(consultation.followUp.date).toLocaleDateString()}
              </div>
            )}
            {consultation.followUp.notes && (
              <div className="text-xs text-muted-foreground mt-1">
                {consultation.followUp.notes}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
