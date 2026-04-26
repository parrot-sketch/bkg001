'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { BooleanField } from '@/components/nurse/ward-prep-checklist/fields';

export function DocumentationSection({ data, onChange, disabled }: WardChecklistSectionProps) {
    const d = data.documentation ?? {};
    const set = (field: string, value: boolean) => onChange({ ...data, documentation: { ...d, [field]: value } });

    return (
        <div className="space-y-3">
            <BooleanField label="1. WARD CHECKLIST" value={d.wardChecklist} onChange={(v) => set('wardChecklist', v)} disabled={disabled} />
            <BooleanField label="2. COMPLETE/CORRECT DOCUMENTATION" value={d.documentationComplete} onChange={(v) => set('documentationComplete', v)} disabled={disabled} />
            <BooleanField label="3. CORRECT CONSENT" value={d.correctConsent} onChange={(v) => set('correctConsent', v)} disabled={disabled} />
        </div>
    );
}
