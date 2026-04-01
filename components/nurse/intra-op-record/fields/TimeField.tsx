'use client';

import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
