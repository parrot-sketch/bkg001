'use client';

/**
 * Treatment Plan Tab
 * 
 * Treatment plan and next steps.
 * Links to case planning workflow if procedure recommended.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2, ExternalLink, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

interface TreatmentPlanTabProps {
  consultation: ConsultationResponseDto | null;
  hasCasePlan: boolean;
  onPlanChange?: (plan: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  isReadOnly?: boolean;
}

export function TreatmentPlanTab({
  consultation,
  hasCasePlan,
  onPlanChange,
  onSave,
  isSaving = false,
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
    <div className="space-y-4">
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

      <div>
        <Label htmlFor="next-steps" className="text-sm font-medium">
          Next Steps & Timeline
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Document next steps, timeline, and patient instructions.
        </p>
        <RichTextEditor
          content={nextSteps}
          onChange={handleChange}
          placeholder="Next steps, timeline, pre-op requirements, patient instructions..."
          readOnly={isReadOnly}
          minHeight="400px"
        />
      </div>

      {/* Save Button */}
      {!isReadOnly && onSave && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || !nextSteps.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Treatment Plan'}
          </Button>
        </div>
      )}

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
