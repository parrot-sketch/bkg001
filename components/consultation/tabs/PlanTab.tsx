'use client';

import Link from 'next/link';
import { Calendar, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

interface PlanTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  consultation?: ConsultationResponseDto | null;
  isReadOnly?: boolean;
}

export function PlanTab({
  initialValue = '',
  onChange,
  consultation,
  isReadOnly = false,
}: PlanTabProps) {
  const nextSteps = initialValue;

  const handleChange = (value: string) => {
    onChange(value);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <span className="text-xs font-bold text-slate-600">P</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Plan</h2>
          <p className="text-xs text-slate-500">Treatment plan, investigations, medications, and follow-up</p>
        </div>
      </div>

      {/* Case Plan Banner */}
      {consultation?.hasCasePlan && consultation?.casePlanId && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900">Case Plan Created</p>
              <p className="text-xs text-slate-600 mt-0.5">
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
      <ClinicalRichTextEditor
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
