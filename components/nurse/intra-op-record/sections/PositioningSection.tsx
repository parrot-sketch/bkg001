'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const POSITION_OPTIONS = [
    { value: 'PRONE', label: 'Prone' },
    { value: 'SUPINE', label: 'Supine' },
    { value: 'LATERAL', label: 'Lateral' },
    { value: 'LITHOTOMY', label: 'Lithotomy' },
    { value: 'OTHER', label: 'Other' },
];

const ARMS_POSITION_OPTIONS = [
    'Tucked',
    'Armboard Left',
    'Armboard Right',
    'Abducted',
    'Pronated',
    'Other',
];

const BELT_POSITION_OPTIONS = [
    'Chest',
    'Over Legs',
    'Over Arms',
    'Pelvis',
    'Other',
];

interface PositioningSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function PositioningSection({ data, onChange, disabled }: PositioningSectionProps) {
    const d = data.positioning ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, positioning: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Patient Position (tick)</Label>
                    <Select value={d.position || ''} onValueChange={(v) => set('position', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Position" /></SelectTrigger>
                        <SelectContent>
                            {POSITION_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {d.position === 'OTHER' && <TextField label="Other Position" value={d.otherPosition} onChange={(v) => set('otherPosition', v)} disabled={disabled} />}
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-2">
                    <BooleanField label="Arms secured" value={d.armsSecured} onChange={(v) => set('armsSecured', v)} disabled={disabled} />
                    {d.armsSecured && (
                        <div className="space-y-1.5">
                            <Label className="text-sm">Arms Position</Label>
                            <Select value={d.armsPosition || ''} onValueChange={(v) => set('armsPosition', v)} disabled={disabled}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                    {ARMS_POSITION_OPTIONS.map((o) => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <BooleanField label="Safety belt applied" value={d.safetyBeltApplied} onChange={(v) => set('safetyBeltApplied', v)} disabled={disabled} />
                    {d.safetyBeltApplied && (
                        <div className="space-y-1.5">
                            <Label className="text-sm">Belt Position</Label>
                            <Select value={d.safetyBeltPosition || ''} onValueChange={(v) => set('safetyBeltPosition', v)} disabled={disabled}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                    {BELT_POSITION_OPTIONS.map((o) => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <BooleanField label="Pressure points padding checked" value={d.pressurePointsPaddingChecked} onChange={(v) => set('pressurePointsPaddingChecked', v)} disabled={disabled} />
                <BooleanField label="Body alignment checked" value={d.bodyAlignmentChecked} onChange={(v) => set('bodyAlignmentChecked', v)} disabled={disabled} />
                <BooleanField label="Patient in proper body alignment" value={d.bodyAlignmentCorrect} onChange={(v) => set('bodyAlignmentCorrect', v)} disabled={disabled} />
                <TextField label="Pressure points (describe)" value={d.pressurePointsDescribe} onChange={(v) => set('pressurePointsDescribe', v)} disabled={disabled} />
            </div>
            <TextField label="Notes" value={d.notes} onChange={(v) => set('notes', v)} disabled={disabled} placeholder="Additional positioning notes..." />
        </div>
    );
}
