'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface NumberFieldProps {
    label: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    disabled: boolean;
    warning?: { message: string; severity: 'warning' | 'critical' };
}

export function NumberField({
    label,
    value,
    onChange,
    min,
    max,
    step,
    unit,
    disabled,
    warning,
}: NumberFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">
                {label} {unit && <span className="text-muted-foreground font-normal">({unit})</span>}
            </Label>
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    min={min}
                    max={max}
                    step={step || 1}
                    disabled={disabled}
                    className={`h-9 max-w-[150px] ${
                        warning
                            ? warning.severity === 'critical'
                                ? 'border-red-400 focus-visible:ring-red-400'
                                : 'border-amber-400 focus-visible:ring-amber-400'
                            : ''
                    }`}
                />
                {warning && (
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md font-medium ${
                        warning.severity === 'critical'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {warning.message}
                    </div>
                )}
            </div>
        </div>
    );
}