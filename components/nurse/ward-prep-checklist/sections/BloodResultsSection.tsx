'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { BooleanField } from '@/components/nurse/ward-prep-checklist/fields';

export function BloodResultsSection({ data, onChange, disabled }: WardChecklistSectionProps) {
  const d = data.bloodResults ?? {};
  const set = (field: string, value: unknown) => onChange({ ...data, bloodResults: { ...d, [field]: value } });

  return (
    <div className="space-y-4">
      <BooleanField
        label="4. BLOOD/RESULTS (Hb, UECs, X-Match) checked"
        value={d.bloodResultsChecked}
        onChange={(v) => set('bloodResultsChecked', v)}
        disabled={disabled}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Hb</Label>
          <Input
            value={d.hb || ''}
            onChange={(e) => set('hb', e.target.value)}
            disabled={disabled}
            className="h-9 bg-white"
            placeholder="e.g. 12.5"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">UECs</Label>
          <Input
            value={d.uecs || ''}
            onChange={(e) => set('uecs', e.target.value)}
            disabled={disabled}
            className="h-9 bg-white"
            placeholder="e.g. Normal"
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm">UNITS AVAILABLE</Label>
          <Input
            type="number"
            value={d.xMatchUnitsAvailable ?? ''}
            onChange={(e) => set('xMatchUnitsAvailable', e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className="h-9 bg-white max-w-[180px]"
            min={0}
          />
        </div>
      </div>
    </div>
  );
}
