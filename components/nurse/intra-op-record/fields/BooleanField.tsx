'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface BooleanFieldProps {
    label: string;
    value: boolean | undefined;
    onChange: (v: boolean) => void;
    disabled: boolean;
}

export function BooleanField({ label, value, onChange, disabled }: BooleanFieldProps) {
    return (
        <div className="flex items-center gap-3 py-1.5">
            <Checkbox
                checked={!!value}
                onCheckedChange={(checked) => onChange(checked === true)}
                disabled={disabled}
                id={label}
            />
            <Label htmlFor={label} className="text-sm font-normal cursor-pointer">
                {label}
            </Label>
        </div>
    );
}
