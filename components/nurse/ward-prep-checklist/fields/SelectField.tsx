'use client';

import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SelectFieldProps<T extends string> {
    label: string;
    value: T | undefined;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    disabled: boolean;
    placeholder?: string;
}

export function SelectField<T extends string>({
    label,
    value,
    onChange,
    options,
    disabled,
    placeholder,
}: SelectFieldProps<T>) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <Select
                value={value ?? ''}
                onValueChange={(v) => onChange(v as T)}
                disabled={disabled}
            >
                <SelectTrigger className="h-9 w-full max-w-[260px]">
                    <SelectValue placeholder={placeholder ?? `Select ${label}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}