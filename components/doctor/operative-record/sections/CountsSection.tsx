'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface Props {
  value: SurgeonOperativeNoteDraft['countsConfirmation'];
  disabled: boolean;
  nurseHasDiscrepancy: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['countsConfirmation']>) => void;
}

export function CountsSection({ value, disabled, nurseHasDiscrepancy, onChange }: Props) {
  const v: any = value ?? {};

  const handleCheckboxChange = (field: 'countsCorrectY' | 'countsCorrectN') => {
    const current = v[field] === true;
    const updates: any = { ...(value ?? {}), [field]: !current };
    // Enforce mutual exclusivity
    if (field === 'countsCorrectY' && !current) {
      updates.countsCorrectN = false;
    } else if (field === 'countsCorrectN' && !current) {
      updates.countsCorrectY = false;
    }
    onChange(updates);
  };

  return (
    <div className="space-y-4">
      {nurseHasDiscrepancy && (
        <p className="text-xs text-rose-700">
          Nurse intra-op record reports a discrepancy. Counts cannot be marked correct.
        </p>
      )}

      {/* Swab & Instrument Count Correct - Y/N checkboxes */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-700 mb-3">
          SWAB &amp; INSTRUMENT COUNT CORRECT
        </label>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={v.countsCorrectY === true}
              disabled={disabled || nurseHasDiscrepancy}
              onChange={() => handleCheckboxChange('countsCorrectY')}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm">Y</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={v.countsCorrectN === true}
              disabled={disabled}
              onChange={() => handleCheckboxChange('countsCorrectN')}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm">N</span>
          </label>
        </div>
      </div>

      {v.countsCorrectN === true && (
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
            Explanation
          </label>
          <RichTextEditor
            content={v.countsExplanation ?? ''}
            onChange={(html) => onChange({ ...(value ?? {}), countsExplanation: html } as any)}
            readOnly={disabled}
            minHeight="100px"
            placeholder="Document explanation for incorrect counts..."
          />
        </div>
      )}

      {/* Scrub Nurse Signature - server-side */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
          SIGNATURE OF SCRUB NURSE
        </label>
        {v.scrubNurseSignaturePng ? (
          <img
            alt="Scrub nurse signature"
            src={v.scrubNurseSignaturePng}
            className="max-w-[320px] border rounded-md bg-white"
            style={{ height: '80px' }}
          />
        ) : (
          <p className="text-xs text-slate-500 italic">Signature captured upon finalization</p>
        )}
      </div>

      {/* Surgeon Signature - Page 1 - server-side */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
          SIGNATURE OF SURGEON
        </label>
        {v.surgeonSignaturePage1Png ? (
          <img
            alt="Surgeon signature"
            src={v.surgeonSignaturePage1Png}
            className="max-w-[320px] border rounded-md bg-white"
            style={{ height: '80px' }}
          />
        ) : (
          <p className="text-xs text-slate-500 italic">Signature captured upon finalization</p>
        )}
      </div>
    </div>
  );
}

