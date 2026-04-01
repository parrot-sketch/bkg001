'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

function BooleanField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: boolean | undefined;
    onChange: (v: boolean) => void;
    disabled: boolean;
}) {
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

interface CatheterSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function CatheterSection({ data, onChange, disabled }: CatheterSectionProps) {
    const d = data.catheter ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, catheter: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BooleanField label="Urinary catheter in-situ" value={d.inSitu} onChange={(v) => set('inSitu', v)} disabled={disabled} />
                <BooleanField label="Urinary catheter inserted in theatre" value={d.insertedInTheatre} onChange={(v) => set('insertedInTheatre', v)} disabled={disabled} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Type" value={d.type} onChange={(v) => set('type', v)} disabled={disabled} />
                <TextField label="Size" value={d.size} onChange={(v) => set('size', v)} disabled={disabled} />
            </div>
        </div>
    );
}
