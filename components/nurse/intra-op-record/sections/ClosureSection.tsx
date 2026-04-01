'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserSelect } from '@/components/ui/UserSelect';

const SKIN_CLOSURE_OPTIONS = [
    { value: 'SUTURES', label: 'Sutures' },
    { value: 'STAPLES', label: 'Staples' },
    { value: 'STERI_STRIPS', label: 'Steri-Strips' },
    { value: 'GLUE', label: 'Tissue Glue' },
    { value: 'SECONDARY', label: 'Secondary Closure' },
    { value: 'OTHER', label: 'Other' },
];
const SKIN_CLOSURE_VALUES = SKIN_CLOSURE_OPTIONS.map((o) => o.value);

const DRESSING_TYPE_OPTIONS = [
    { value: 'DRY', label: 'Dry Dressing' },
    { value: 'WET', label: 'Wet Dressing' },
    { value: 'TRANSPARENT', label: 'Transparent Film' },
    { value: 'PRESSURE', label: 'Pressure Dressing' },
    { value: 'TULLE', label: 'Tulle Gras' },
    { value: 'OTHER', label: 'Other' },
];
const DRESSING_TYPE_VALUES = DRESSING_TYPE_OPTIONS.map((o) => o.value);

interface ClosureAndFinalSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function ClosureAndFinalSection({ data, onChange, disabled }: ClosureAndFinalSectionProps) {
    const d = data.closure ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, closure: { ...d, [field]: value } });

    const skinClosureValue = SKIN_CLOSURE_VALUES.includes(d.skinClosure || '') ? (d.skinClosure || '') : (d.skinClosure ? 'OTHER' : '');
    const dressingValue = DRESSING_TYPE_VALUES.includes(d.dressingApplied || '') ? (d.dressingApplied || '') : (d.dressingApplied ? 'OTHER' : '');

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Closure Type</Label>
                    <Select
                        value={d.closureType || skinClosureValue || ''}
                        onValueChange={(v) => {
                            if (['ABSORBABLE', 'NON_ABSORBABLE', 'STAPLES', 'GLUE'].includes(v)) {
                                set('closureType', v);
                            } else {
                                set('skinClosure', v);
                                if (v !== 'OTHER') set('skinClosureOther', undefined);
                            }
                        }}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select closure type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ABSORBABLE">Absorbable</SelectItem>
                            <SelectItem value="NON_ABSORBABLE">Non-Absorbable</SelectItem>
                            <SelectItem value="STAPLES">Staples</SelectItem>
                            <SelectItem value="GLUE">Glue</SelectItem>
                            {SKIN_CLOSURE_OPTIONS.filter(opt => !['ABSORBABLE', 'NON_ABSORBABLE', 'STAPLES', 'GLUE'].includes(opt.value)).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {skinClosureValue === 'OTHER' && !d.closureType && (
                        <input
                            type="text"
                            className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
                            placeholder="Specify closure method..."
                            defaultValue={SKIN_CLOSURE_VALUES.includes(d.skinClosure || '') ? '' : (d.skinClosure || '')}
                            onChange={(e) => set('skinClosure', e.target.value || 'OTHER')}
                            disabled={disabled}
                        />
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-sm">Dressing Applied</Label>
                    <Select
                        value={dressingValue}
                        onValueChange={(v) => {
                            set('dressingApplied', v);
                            if (v !== 'OTHER') set('dressingOther', undefined);
                        }}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select dressing" /></SelectTrigger>
                        <SelectContent>
                            {DRESSING_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {dressingValue === 'OTHER' && (
                        <input
                            type="text"
                            className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
                            placeholder="Specify dressing type..."
                            defaultValue={DRESSING_TYPE_VALUES.includes(d.dressingApplied || '') ? '' : (d.dressingApplied || '')}
                            onChange={(e) => set('dressingApplied', e.target.value || 'OTHER')}
                            disabled={disabled}
                        />
                    )}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label className="text-sm">Count Verified By</Label>
                <UserSelect
                    value={d.countVerifiedBy || ''}
                    onChange={(v) => set('countVerifiedBy', v)}
                    placeholder="Select verifier..."
                    role="NURSE"
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
