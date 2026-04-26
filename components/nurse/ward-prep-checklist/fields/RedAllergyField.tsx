'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function RedAllergyField(props: {
  value: string | undefined;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const { value, onChange, disabled } = props;
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        6. ALLERGIES (STATE IN RED)
        <span className="text-xs text-slate-400 font-normal ml-2">Required</span>
      </Label>
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        data-allergy-field="true"
        className="bg-white text-sm resize-none border-2 border-rose-200 focus-visible:ring-rose-300"
        placeholder="Write clearly in red…"
        style={{
          color: '#b91c1c',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      />
      <p className="text-xs text-slate-500">This field prints in red for patient safety.</p>
    </div>
  );
}

