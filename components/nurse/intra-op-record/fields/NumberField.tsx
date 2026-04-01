'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NumberFieldProps {
    label: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    unit?: string;
    disabled: boolean;
}

export function NumberField({ label, value, onChange, unit, disabled }: NumberFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}{unit ? ` (${unit})` : ''}</Label>
            <Input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                disabled={disabled}
                className="h-9"
            />
        </div>
    );
}
