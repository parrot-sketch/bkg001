'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { BooleanField } from '@/components/nurse/ward-prep-checklist/fields';

export function PreparationSection({ data, onChange, disabled }: WardChecklistSectionProps) {
  const d = data.preparation ?? {};
  const set = (field: string, value: boolean) => onChange({ ...data, preparation: { ...d, [field]: value } });

  return (
    <div className="space-y-3">
      <BooleanField
        label="8. PERI-OPERATIVE PREPARATION – Bath/Shower/Gown"
        value={d.bathGown}
        onChange={(v) => set('bathGown', v)}
        disabled={disabled}
      />
      <BooleanField
        label="8. – Shave/Skin Preparation"
        value={d.shaveSkinPrep}
        onChange={(v) => set('shaveSkinPrep', v)}
        disabled={disabled}
      />
      <BooleanField
        label="8. – ID Band"
        value={d.idBandOn}
        onChange={(v) => set('idBandOn', v)}
        disabled={disabled}
      />
      <BooleanField
        label="8. – Patient Positioned on Canvas"
        value={d.correctPositioning}
        onChange={(v) => set('correctPositioning', v)}
        disabled={disabled}
      />
      <BooleanField
        label="8. – Jewellery/Valuables Removed"
        value={d.jewelryRemoved}
        onChange={(v) => set('jewelryRemoved', v)}
        disabled={disabled}
      />
      <BooleanField
        label="8. – Make-up/Nail Varnish Removed"
        value={d.makeupNailPolishRemoved}
        onChange={(v) => set('makeupNailPolishRemoved', v)}
        disabled={disabled}
      />
    </div>
  );
}

