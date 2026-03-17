'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserSelect } from '@/components/ui/UserSelect';
import { ShieldCheck, Clock, AlertTriangle, Users } from 'lucide-react';

interface StaffingSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled?: boolean;
}

export function StaffingSection({ data, onChange, disabled }: StaffingSectionProps) {
    const d = data.staffing ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, staffing: { ...d, [field]: value } });

    const anesthesiaTypes = ['General', 'Spinal', 'Regional', 'Local', 'Sedation', 'Other'];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                <Users className="h-4 w-4" />
                <span className="font-semibold">Surgical Team</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Surgeon</Label>
                    <UserSelect
                        value={d.surgeon || ''}
                        onChange={(v) => set('surgeon', v)}
                        placeholder="Select surgeon..."
                        role="DOCTOR"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Assistant</Label>
                    <UserSelect
                        value={d.assistant || ''}
                        onChange={(v) => set('assistant', v)}
                        placeholder="Select assistant..."
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Anaesthesiologist</Label>
                    <UserSelect
                        value={d.anaesthesiologist || ''}
                        onChange={(v) => set('anaesthesiologist', v)}
                        placeholder="Select anaesthesiologist..."
                        role="DOCTOR"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Scrub Nurse</Label>
                    <UserSelect
                        value={d.scrubNurse || ''}
                        onChange={(v) => set('scrubNurse', v)}
                        placeholder="Select scrub nurse..."
                        role="NURSE"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Circulating Nurse</Label>
                    <UserSelect
                        value={d.circulatingNurse || ''}
                        onChange={(v) => set('circulatingNurse', v)}
                        placeholder="Select circulating nurse..."
                        role="NURSE"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Observers / Other</Label>
                    <Input
                        value={d.observers || ''}
                        onChange={(e) => set('observers', e.target.value)}
                        placeholder="Other staff present"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2 lg:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Anaesthesia Type</Label>
                    <Select value={d.anesthesiaType || ''} onValueChange={(v) => set('anesthesiaType', v)} disabled={disabled}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {anesthesiaTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Pre-op Diagnosis</Label>
                    <Input
                        value={d.preOpDiagnosis || ''}
                        onChange={(e) => set('preOpDiagnosis', e.target.value)}
                        placeholder="Pre-operative diagnosis"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Intra-op Diagnosis</Label>
                    <Input
                        value={d.intraOpDiagnosis || ''}
                        onChange={(e) => set('intraOpDiagnosis', e.target.value)}
                        placeholder="Intra-operative diagnosis"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2 lg:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Operations Performed</Label>
                    <Input
                        value={d.operationsPerformed || ''}
                        onChange={(e) => set('operationsPerformed', e.target.value)}
                        placeholder="List procedures performed"
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}
