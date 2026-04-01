'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserSelect } from '@/components/ui/UserSelect';
import { TextField } from '../fields';

interface CountsSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function CountsSection({ data, onChange, disabled }: CountsSectionProps) {
    const d = data.counts ?? {};
    const items = Array.isArray(d.items) ? d.items : [];
    const set = (field: string, value: any) =>
        onChange({ ...data, counts: { ...d, [field]: value } });

    const updateItem = (index: number, field: string, value: number) => {
        const next = [...items];
        next[index] = { ...next[index], [field]: value };
        set('items', next);
    };

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Item</th>
                            <th className="px-4 py-3 font-semibold text-center">Preliminary</th>
                            <th className="px-4 py-3 font-semibold text-center">Wound Closure</th>
                            <th className="px-4 py-3 font-semibold text-center">Final Count</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(items as any[]).map((item: any, idx: number) => (
                            <tr key={item.name} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                                <td className="px-4 py-3">
                                    <Input type="number" value={item.preliminary} onChange={(e) => updateItem(idx, 'preliminary', parseInt(e.target.value) || 0)} disabled={disabled} className="h-8 w-20 mx-auto text-center" />
                                </td>
                                <td className="px-4 py-3">
                                    <Input type="number" value={item.woundClosure} onChange={(e) => updateItem(idx, 'woundClosure', parseInt(e.target.value) || 0)} disabled={disabled} className="h-8 w-20 mx-auto text-center" />
                                </td>
                                <td className="px-4 py-3">
                                    <Input type="number" value={item.final} onChange={(e) => updateItem(idx, 'final', parseInt(e.target.value) || 0)} disabled={disabled} className="h-8 w-20 mx-auto text-center font-semibold text-blue-600" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                    <Label className="text-sm font-semibold">Count Correct?</Label>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox checked={d.countCorrect === true} onCheckedChange={() => set('countCorrect', true)} disabled={disabled} />
                            <Label className="text-sm">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox checked={d.countCorrect === false} onCheckedChange={() => set('countCorrect', false)} disabled={disabled} />
                            <Label className="text-sm">No</Label>
                        </div>
                    </div>
                </div>
                {!d.countCorrect && <TextField label="Action taken" value={d.actionIfIncorrect} onChange={(v) => set('actionIfIncorrect', v)} disabled={disabled} placeholder="Describe corrective action..." />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Scrub Nurse Signature</Label>
                    <UserSelect
                        value={d.scrubNurseSignature || ''}
                        onChange={(v) => set('scrubNurseSignature', v)}
                        placeholder="Select scrub nurse..."
                        role="NURSE"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Circulating Nurse Signature</Label>
                    <UserSelect
                        value={d.circulatingNurseSignature || ''}
                        onChange={(v) => set('circulatingNurseSignature', v)}
                        placeholder="Select circulating nurse..."
                        role="NURSE"
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}
