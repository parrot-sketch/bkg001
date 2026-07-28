'use client';

import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';

interface AssessmentTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

export function AssessmentTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: AssessmentTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <span className="text-xs font-bold text-slate-600">A</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Assessment</h2>
          <p className="text-xs text-slate-500">Clinical reasoning, diagnosis, and differential diagnoses</p>
        </div>
      </div>

      <ClinicalRichTextEditor
        content={initialValue}
        onChange={onChange}
        placeholder="Document clinical impression, working diagnosis, differential diagnoses..."
        readOnly={isReadOnly}
        minHeight="400px"
      />
    </div>
  );
}
