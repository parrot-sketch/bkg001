'use client';

import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { BooleanField } from '../fields';
import { SectionWrapper } from '../components/SectionWrapper';

interface DocumentationSectionProps {
    data: NursePreopWardChecklistDraft;
    onChange: (data: NursePreopWardChecklistDraft) => void;
    disabled: boolean;
    complete: boolean;
}

export function DocumentationSection({ data, onChange, disabled, complete }: DocumentationSectionProps) {
    const d = data.documentation ?? {};
    const set = (field: string, value: boolean) => onChange({ ...data, documentation: { ...d, [field]: value } });

    return (
        <SectionWrapper sectionKey="documentation" label="Documentation" complete={complete}>
            <div className="space-y-3">
                <BooleanField label="Documentation complete and correct" value={d.documentationComplete} onChange={(v) => set('documentationComplete', v)} disabled={disabled} />
                <BooleanField label="Correct consent signed" value={d.correctConsent} onChange={(v) => set('correctConsent', v)} disabled={disabled} />
            </div>
        </SectionWrapper>
    );
}