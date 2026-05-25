'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SummaryEditorProps {
  autoSummary: string;
  summary: string;
  summaryEdited: boolean;
  onSummaryChange: (value: string) => void;
  onEditClick: () => void;
}

export function SummaryEditor({
  autoSummary,
  summary,
  summaryEdited,
  onSummaryChange,
  onEditClick,
}: SummaryEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700">
          Consultation Summary
        </Label>
        {!summaryEdited && (
          <button
            type="button"
            onClick={onEditClick}
            className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
          >
            Edit summary
          </button>
        )}
      </div>

      {summaryEdited ? (
        <Textarea
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          rows={5}
          className="text-sm font-mono rounded-none"
          placeholder="Consultation summary…"
        />
      ) : (
        <div className="text-xs text-slate-700 bg-white border border-slate-200 p-3 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
          {autoSummary || (
            <span className="text-slate-400 italic">No notes documented yet.</span>
          )}
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Auto-generated from your structured notes. Click &quot;Edit&quot; to customize.
      </p>
    </div>
  );
}
