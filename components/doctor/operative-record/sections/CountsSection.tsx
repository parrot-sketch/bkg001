'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { TypeField, YesNoToggle, stripToPlain } from '../ui';

interface Props {
  value: SurgeonOperativeNoteDraft['countsConfirmation'];
  disabled: boolean;
  nurseHasDiscrepancy: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['countsConfirmation']>) => void;
}

export function CountsSection({ value, disabled, nurseHasDiscrepancy, onChange }: Props) {
  const v = value ?? ({} as NonNullable<SurgeonOperativeNoteDraft['countsConfirmation']>);

  const patch = (
    partial: Partial<NonNullable<SurgeonOperativeNoteDraft['countsConfirmation']>>,
  ) => {
    onChange({ ...v, ...partial } as NonNullable<SurgeonOperativeNoteDraft['countsConfirmation']>);
  };

  const counts: 'Y' | 'N' | null = v.countsCorrectY ? 'Y' : v.countsCorrectN ? 'N' : null;

  return (
    <div className="space-y-5">
      {nurseHasDiscrepancy ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Nursing reported a count discrepancy. Mark counts as <strong>No</strong> and explain.
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <p className="text-xs font-medium text-slate-600">Swab &amp; instrument count correct?</p>
        <YesNoToggle
          value={counts}
          disabled={disabled}
          yesDisabled={nurseHasDiscrepancy}
          onChange={(next) =>
            patch({
              countsCorrectY: next === 'Y',
              countsCorrectN: next === 'N',
            })
          }
        />
      </div>

      {counts === 'N' ? (
        <TypeField
          label="Explanation"
          value={stripToPlain(v.countsExplanation)}
          onChange={(countsExplanation) => patch({ countsExplanation })}
          placeholder="Why incorrect…"
          disabled={disabled}
          rows={4}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SignatureSlot
          label="Scrub nurse"
          src={v.scrubNurseSignaturePng}
        />
        <SignatureSlot
          label="Surgeon"
          src={v.surgeonSignaturePage1Png}
        />
      </div>
      <p className="text-[11px] text-slate-400">Signatures are applied automatically when you finalize.</p>
    </div>
  );
}

function SignatureSlot({ label, src }: { label: string; src?: string | null }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`${label} signature`} src={src} className="mt-2 h-16 max-w-full object-contain" />
      ) : (
        <p className="mt-2 text-xs text-slate-400">Pending finalize</p>
      )}
    </div>
  );
}
