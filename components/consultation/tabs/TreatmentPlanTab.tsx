'use client';

/**
 * Treatment Plan Tab
 * 
 * Single responsibility: treatment plan notes (`plan` field).
 * Also displays case plan links and follow-up information.
 * 
 * Auto-saves via parent context — no per-tab save button needed.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2, ExternalLink, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarPlus className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Treatment Plan & Next Steps</h2>
        </div>
        <p className="text-xs text-slate-500 ml-6">
          Document the treatment plan, timeline, pre-op requirements, and patient instructions.
        </p>
      </div>

      {/* Case Plan Banner */}
      {hasCasePlan && consultation?.casePlanId && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Case Plan Created</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                A detailed surgical case plan is linked to this consultation
              </p>
            </div>
          </div>
          {!isReadOnly && (
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link href={`/doctor/case-plans/${consultation.casePlanId}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Plan
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Treatment Plan Editor */}
      <RichTextEditor
        content={nextSteps}
        onChange={handleChange}
        placeholder="Treatment plan, timeline, pre-op requirements, post-op care, patient instructions…"
        readOnly={isReadOnly}
        minHeight="350px"
      />

      {/* Follow-Up Info */}
      {consultation?.followUp && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Follow-Up Scheduled</span>
          </div>
          {consultation.followUp.date && (
            <div className="flex items-center gap-2 ml-6">
              <Badge variant="outline" className="text-xs bg-white">
                {new Date(consultation.followUp.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Badge>
            </div>
          )}
          {consultation.followUp.notes && (
            <p className="text-xs text-blue-700 mt-2 ml-6 leading-relaxed">
              {consultation.followUp.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
