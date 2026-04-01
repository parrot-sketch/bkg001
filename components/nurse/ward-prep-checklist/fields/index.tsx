'use client';

import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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

interface TimeFieldProps {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    disabled: boolean;
}

export function TimeField({ label, value, onChange, disabled }: TimeFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                    type="time"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="h-9 pl-10 pr-3 max-w-[160px] font-mono"
                />
            </div>
        </div>
    );
}

interface DateFieldProps {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    disabled: boolean;
}

export function DateField({ label, value, onChange, disabled }: DateFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <Input
                type="date"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="h-9 max-w-[180px]"
            />
        </div>
    );
}

interface SelectFieldProps {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    disabled: boolean;
}

export function SelectField({ label, value, onChange, options, placeholder, disabled }: SelectFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
