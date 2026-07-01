'use client';

import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface ObjectiveTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

export function ObjectiveTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: ObjectiveTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <span className="text-xs font-bold text-slate-600">O</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Objective</h2>
          <p className="text-xs text-slate-500">Clinical findings, examination results, and observations</p>
        </div>
      </div>

      <RichTextEditor
        content={initialValue}
        onChange={onChange}
        placeholder="Document vitals, physical examination findings, investigation results..."
        readOnly={isReadOnly}
        minHeight="400px"
      />
    </div>
  );
}
