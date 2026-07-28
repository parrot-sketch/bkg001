'use client';

/**
 * Examination tab - free-form clinical documentation
 */

import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';
import { CheckCircle2, FileText } from 'lucide-react';

interface ExaminationTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

export function ExaminationTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: ExaminationTabProps) {
  const hasContent = initialValue.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <FileText className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Examination</h2>
          {hasContent && (
            <span className="text-xs text-emerald-600 font-medium">Recorded</span>
          )}
        </div>
      </div>

      <ClinicalRichTextEditor
        content={initialValue}
        onChange={onChange}
        placeholder="Document examination findings..."
        readOnly={isReadOnly}
        minHeight="400px"
      />
    </div>
  );
}
