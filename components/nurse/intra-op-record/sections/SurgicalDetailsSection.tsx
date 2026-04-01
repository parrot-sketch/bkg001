'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextField } from '../fields';

interface SurgicalDetailsSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function SurgicalDetailsSection({ data, onChange, disabled }: SurgicalDetailsSectionProps) {
    const d = data.surgicalDetails ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, surgicalDetails: { ...d, [field]: value } });

    const toggle = (listKey: string, val: string) => {
        const current = Array.isArray((d as any)[listKey]) ? (d as any)[listKey] : [];
        const next = current.includes(val) ? current.filter((x: string) => x !== val) : [...current, val];
        set(listKey, next);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Drain Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {['CORRUGATED', 'PORTOVAC', 'UWS', 'NG'].map(t => (
                            <div key={t} className="flex items-center gap-2">
                                <Checkbox checked={d.drainType?.includes(t as any)} onCheckedChange={() => toggle('drainType', t)} disabled={disabled} />
                                <Label className="text-xs font-normal">{t}</Label>
                            </div>
                        ))}
                    </div>
                    <TextField label="Other Drain Type" value={d.otherDrainType} onChange={(v) => set('otherDrainType', v)} disabled={disabled} />
                </div>
                <div className="space-y-3">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Wound Irrigation</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {['SALINE', 'WATER', 'POVIDONE_IODINE', 'ANTIBIOTIC'].map(t => (
                            <div key={t} className="flex items-center gap-2">
                                <Checkbox checked={d.woundIrrigation?.includes(t as any)} onCheckedChange={() => toggle('woundIrrigation', t)} disabled={disabled} />
                                <Label className="text-xs font-normal">{t.replace('_', ' ')}</Label>
                            </div>
                        ))}
                    </div>
                    <TextField label="Other Irrigation" value={d.otherIrrigation} onChange={(v) => set('otherIrrigation', v)} disabled={disabled} />
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Wound Pack Type</Label>
                    <Select value={d.woundPackType || ''} onValueChange={(v) => set('woundPackType', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                            {['Ribbon Gauze','Gamgee','Non-adhesive','Petroleum gauze','Alginate','Foam','None','Other'].map(o => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <TextField label="Wound Pack Site" value={d.woundPackSite} onChange={(v) => set('woundPackSite', v)} disabled={disabled} />
            </div>
            <Separator />
            <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Wound Class</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['CLEAN', 'CLEAN_CONTAMINATED', 'CONTAMINATED', 'INFECTED'].map(c => (
                        <div key={c} className="flex items-center gap-2">
                            <Checkbox checked={d.woundClass === c} onCheckedChange={() => set('woundClass', c)} disabled={disabled} />
                            <Label className="text-xs font-normal">{c.replace('_', ' ')}</Label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
