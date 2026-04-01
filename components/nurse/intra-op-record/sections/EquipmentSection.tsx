'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BooleanField, TextField, TimeField } from '../fields';
import { Zap, Activity } from 'lucide-react';

interface EquipmentSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function EquipmentSection({ data, onChange, disabled }: EquipmentSectionProps) {
    const el = data.equipment?.electrosurgical ?? {};
    const tq = data.equipment?.tourniquet ?? {};

    const setEl = (field: string, value: any) =>
        onChange({ ...data, equipment: { ...data.equipment, electrosurgical: { ...el, [field]: value } } });
    const setTq = (field: string, value: any) =>
        onChange({ ...data, equipment: { ...data.equipment, tourniquet: { ...tq, [field]: value } } });

    return (
        <div className="space-y-6">
            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Electrosurgical / Cautery</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BooleanField label="Cautery Used" value={el.cauteryUsed} onChange={(v) => setEl('cauteryUsed', v)} disabled={disabled} />
                    <TextField label="Unit Number" value={el.cauteryUnitNumber || el.unitNo} onChange={(v) => setEl('cauteryUnitNumber', v)} disabled={disabled} />
                    <TextField label="Mode" value={el.mode} onChange={(v) => setEl('mode', v)} disabled={disabled} />
                    <div className="grid grid-cols-2 gap-4">
                        <TextField label="Cut Set" value={el.cutSet} onChange={(v) => setEl('cutSet', v)} disabled={disabled} />
                        <TextField label="Coag Set" value={el.coagSet} onChange={(v) => setEl('coagSet', v)} disabled={disabled} />
                    </div>
                </div>
                <div className="flex items-center gap-8 mt-2">
                    <BooleanField label="Skin Checked (Before)" value={el.skinCheckBefore || el.skinCheckedBefore} onChange={(v) => setEl('skinCheckBefore', v)} disabled={disabled} />
                    <BooleanField label="Skin Checked (After)" value={el.skinCheckAfter || el.skinCheckedAfter} onChange={(v) => setEl('skinCheckAfter', v)} disabled={disabled} />
                    <BooleanField label="Patient Earth Plate Checked" value={el.patientEarthPlateChecked} onChange={(v) => setEl('patientEarthPlateChecked', v)} disabled={disabled} />
                </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Tourniquet</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BooleanField label="Tourniquet Used" value={tq.tourniquetUsed} onChange={(v) => setTq('tourniquetUsed', v)} disabled={disabled} />
                    <TextField label="Type" value={tq.type} onChange={(v) => setTq('type', v)} disabled={disabled} />
                    <TextField label="Site" value={tq.site} onChange={(v) => setTq('site', v)} disabled={disabled} />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm">Laterality</Label>
                            <Select value={tq.laterality || ''} onValueChange={(v) => setTq('laterality', v)} disabled={disabled}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Side" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RT">Right (Rt)</SelectItem>
                                    <SelectItem value="LT">Left (Lt)</SelectItem>
                                    <SelectItem value="N/A">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <TextField label="Pressure" value={tq.pressure} onChange={(v) => setTq('pressure', v)} disabled={disabled} />
                    </div>
                    <TimeField label="Time On" value={tq.timeOn} onChange={(v) => setTq('timeOn', v)} disabled={disabled} />
                    <TimeField label="Time Off" value={tq.timeOff} onChange={(v) => setTq('timeOff', v)} disabled={disabled} />
                </div>
                <div className="flex items-center gap-8 mt-2">
                    <BooleanField label="Skin Checked (Before)" value={tq.skinCheckedBefore} onChange={(v) => setTq('skinCheckedBefore', v)} disabled={disabled} />
                    <BooleanField label="Skin Checked (After)" value={tq.skinCheckedAfter} onChange={(v) => setTq('skinCheckedAfter', v)} disabled={disabled} />
                </div>
            </div>
        </div>
    );
}
