'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DocumentationStepProps {
  autoSummary: string;
  summary: string;
  summaryEdited: boolean;
  onSummaryChange: (value: string) => void;
  onEditClick: () => void;
}

export function DocumentationStep({
  autoSummary,
  summary,
  summaryEdited,
  onSummaryChange,
  onEditClick,
}: DocumentationStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf]">
          <svg className="h-4 w-4 text-[#caa26a]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2c2e4b]">Consultation Summary</h3>
          <p className="text-[10px] text-[#2c2e4b]/60">Review and edit the clinical notes</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-[#2c2e4b]/60">Outcome</Label>
          {!summaryEdited && (
            <button
              type="button"
              onClick={onEditClick}
              className="text-[11px] text-[#caa26a] hover:text-[#b8913e] font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {summaryEdited ? (
          <Textarea
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            rows={6}
            className="text-sm resize-none rounded-lg border-[#e7d6bf] bg-white focus:border-[#caa26a]"
            placeholder="Consultation summary..."
          />
        ) : (
          <div className="text-xs text-[#2c2e4b] bg-[#e7d6bf]/10 border border-[#e7d6bf] p-3 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto rounded-lg">
            {autoSummary || (
              <span className="text-[#2c2e4b]/40 italic">No notes documented yet.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
