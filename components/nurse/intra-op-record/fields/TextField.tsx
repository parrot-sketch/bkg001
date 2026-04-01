'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TextFieldProps {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled: boolean;
}

export function TextField({ label, value, onChange, placeholder, disabled }: TextFieldProps) {
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
