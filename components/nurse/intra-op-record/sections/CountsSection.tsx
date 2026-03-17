'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserSelect } from '@/components/ui/UserSelect';
import { ListCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CountsSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled?: boolean;
}

export function CountsSection({ data, onChange, disabled }: CountsSectionProps) {
    const d = data.counts ?? {};
    const items = Array.isArray(d.items) ? d.items : [];
    const set = (field: string, value: any) =>
        onChange({ ...data, counts: { ...d, [field]: value } });

    const updateItem = (index: number, field: string, value: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        set('items', newItems);
    };

    const itemTypes = ['Abdominal Swabs', 'Raytec Swabs', 'Throat Packs', 'Other'];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                <ListCheck className="h-4 w-4" />
                <span className="font-semibold">Swab & Instrument Counts</span>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Item Type</th>
                            <th className="px-4 py-3 text-center font-medium text-slate-600 w-24">Preliminary</th>
                            <th className="px-4 py-3 text-center font-medium text-slate-600 w-24">Closure</th>
                            <th className="px-4 py-3 text-center font-medium text-slate-600 w-24">Final</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {itemTypes.map((type, idx) => (
                            <tr key={type}>
                                <td className="px-4 py-2 font-medium text-slate-700">{type}</td>
                                {['prelim', 'closure', 'final'].map((phase) => (
                                    <td key={phase} className="px-2 py-2">
                                        <Input
                                            type="number"
                                            value={items[idx]?.[phase] || ''}
                                            onChange={(e) => updateItem(idx, phase, parseInt(e.target.value) || 0)}
                                            disabled={disabled}
                                            className="h-8 text-center"
                                            placeholder="0"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg">
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Count Correct?</Label>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={d.countCorrect === true}
                                onCheckedChange={(v) => set('countCorrect', v === true)}
                                id="countCorrectYes"
                                disabled={disabled}
                            />
                            <Label htmlFor="countCorrectYes" className="text-sm font-normal cursor-pointer flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Yes
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={d.countCorrect === false}
                                onCheckedChange={(v) => set('countCorrect', v === true ? false : undefined)}
                                id="countCorrectNo"
                                disabled={disabled}
                            />
                            <Label htmlFor="countCorrectNo" className="text-sm font-normal cursor-pointer flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> No
                            </Label>
                        </div>
                    </div>
                </div>

                {!d.countCorrect && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-700">Action Taken</Label>
                        <Input
                            value={d.actionIfIncorrect || ''}
                            onChange={(e) => set('actionIfIncorrect', e.target.value)}
                            placeholder="Describe corrective action..."
                            disabled={disabled}
                            className="border-amber-300"
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Scrub Nurse Signature</Label>
                    <UserSelect
                        value={d.scrubNurseSignature || ''}
                        onChange={(v) => set('scrubNurseSignature', v)}
                        placeholder="Select scrub nurse..."
                        role="NURSE"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Circulating Nurse Signature</Label>
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
