'use client';

import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';

interface SubjectiveTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

export function SubjectiveTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: SubjectiveTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <span className="text-xs font-bold text-slate-600">S</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Subjective</h2>
          <p className="text-xs text-slate-500">Patient-reported symptoms, concerns, and history</p>
        </div>
      </div>

      <ClinicalRichTextEditor
        content={initialValue}
        onChange={onChange}
        placeholder="Document patient concerns, history of present illness, review of systems..."
        readOnly={isReadOnly}
        minHeight="400px"
      />
    </div>
  );
}
