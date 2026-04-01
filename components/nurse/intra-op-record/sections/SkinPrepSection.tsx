'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const PREP_AGENT_OPTIONS = [
    { value: 'HIBITANE_SPIRIT', label: 'Hibitane in spirit' },
    { value: 'HIBITANE_WATER', label: 'Hibitane in water' },
    { value: 'POVIDONE_IODINE', label: 'Povidone Iodine' },
    { value: 'OTHER', label: 'Other' },
];

const PREP_AREA_OPTIONS = [
    'Abdomen',
    'Right Leg',
    'Left Leg',
    'Face',
    'Chest',
    'Back',
    'Perineum',
    'Right Arm',
    'Left Arm',
    'Scalp',
    'Head',
    'Neck',
    'Both Legs',
    'Both Arms',
    'Other',
];

interface SkinPrepSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function SkinPrepSection({ data, onChange, disabled }: SkinPrepSectionProps) {
    const d = data.skinPrep ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, skinPrep: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Prep Agent</Label>
                    <Select value={d.prepAgent || ''} onValueChange={(v) => set('prepAgent', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Agent" /></SelectTrigger>
                        <SelectContent>
                            {PREP_AGENT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {d.prepAgent === 'OTHER' && <TextField label="Other Agent" value={d.otherPrepAgent} onChange={(v) => set('otherPrepAgent', v)} disabled={disabled} />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Prep Area</Label>
                    <Select value={d.prepArea || ''} onValueChange={(v) => set('prepArea', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select area..." /></SelectTrigger>
                        <SelectContent>
                            {PREP_AREA_OPTIONS.map((a) => (
                                <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <TextField label="Prepped By" value={d.prepPerformedBy} onChange={(v) => set('prepPerformedBy', v)} disabled={disabled} placeholder="Name of person who prepped" />
            </div>
            <TextField label="Shaved by" value={d.shavedBy} onChange={(v) => set('shavedBy', v)} disabled={disabled} />
        </div>
    );
}
