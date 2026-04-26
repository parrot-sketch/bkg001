'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { BooleanField, TextField } from '@/components/nurse/ward-prep-checklist/fields';

export function ProstheticsSection({ data, onChange, disabled }: WardChecklistSectionProps) {
  const d = data.prosthetics ?? {};
  const set = (field: string, value: unknown) => onChange({ ...data, prosthetics: { ...d, [field]: value } });

  return (
    <div className="space-y-3">
      <BooleanField label="Contact Lens Removed" value={d.contactLensRemoved} onChange={(v) => set('contactLensRemoved', v)} disabled={disabled} />
      <BooleanField label="Hearing Aid/Limbs" value={d.limbsProsthesisNoted} onChange={(v) => set('limbsProsthesisNoted', v)} disabled={disabled} />
      <BooleanField label="Caps/Crowns/Bridgework Present" value={d.crownsBridgeworkNoted} onChange={(v) => set('crownsBridgeworkNoted', v)} disabled={disabled} />
      <BooleanField label="Dentures Removed" value={d.denturesRemoved} onChange={(v) => set('denturesRemoved', v)} disabled={disabled} />
      <TextField label="Notes" value={d.prostheticNotes} onChange={(v) => set('prostheticNotes', v)} disabled={disabled} />
    </div>
  );
}

