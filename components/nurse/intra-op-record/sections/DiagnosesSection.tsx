'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function TextField({
    label,
    value,
    onChange,
    placeholder,
    disabled,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <Input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || label}
                disabled={disabled}
                className="h-9"
            />
        </div>
    );
}

interface DiagnosesSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function DiagnosesSection({ data, onChange, disabled }: DiagnosesSectionProps) {
    const d = data.diagnoses ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, diagnoses: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <TextField label="Pre-op Diagnosis" value={d.preOpDiagnosis} onChange={(v) => set('preOpDiagnosis', v)} disabled={disabled} />
            <TextField label="Intra-op Diagnosis" value={d.intraOpDiagnosis} onChange={(v) => set('intraOpDiagnosis', v)} disabled={disabled} />
            <TextField label="Operation(s) Performed" value={d.operationPerformed} onChange={(v) => set('operationPerformed', v)} disabled={disabled} />
        </div>
    );
}
