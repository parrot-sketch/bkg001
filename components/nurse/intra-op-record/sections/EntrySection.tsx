'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin } from 'lucide-react';

interface EntrySectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled?: boolean;
}

export function EntrySection({ data, onChange, disabled }: EntrySectionProps) {
    const d = data.entry ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, entry: { ...d, [field]: value } });

    const arrivalModes = ['Stretcher', 'Wheelchair', 'Walking', 'Other'];
    const positions = ['RA', 'LA', 'RL', 'LL', 'Prone', 'Lithotomy', 'Other'];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                <MapPin className="h-4 w-4" />
                <span className="font-semibold">Pre-Operative Nursing Checks</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Date</Label>
                    <Input
                        type="date"
                        value={d.date || ''}
                        onChange={(e) => set('date', e.target.value)}
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Time In</Label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="time"
                            className="pl-9"
                            value={d.timeIn || ''}
                            onChange={(e) => set('timeIn', e.target.value)}
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Mode of Arrival</Label>
                    <Select value={d.modeOfArrival || ''} onValueChange={(v) => set('modeOfArrival', v)} disabled={disabled}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            {arrivalModes.map((mode) => (
                                <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">ASA Class</Label>
                    <Select value={d.asaClass || ''} onValueChange={(v) => set('asaClass', v)} disabled={disabled}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select ASA class" />
                        </SelectTrigger>
                        <SelectContent>
                            {[1, 2, 3, 4, 5].map((asa) => (
                                <SelectItem key={asa} value={asa.toString()}>ASA {asa}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Position</Label>
                    <Select value={d.position || ''} onValueChange={(v) => set('position', v)} disabled={disabled}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                            {positions.map((pos) => (
                                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-slate-500">Verification Checks</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={d.patientIdVerified === true}
                            onCheckedChange={(v) => set('patientIdVerified', v === true)}
                            id="patientIdVerified"
                            disabled={disabled}
                        />
                        <Label htmlFor="patientIdVerified" className="text-sm font-normal cursor-pointer">
                            Patient ID Verified
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={d.consentSigned === true}
                            onCheckedChange={(v) => set('consentSigned', v === true)}
                            id="consentSigned"
                            disabled={disabled}
                        />
                        <Label htmlFor="consentSigned" className="text-sm font-normal cursor-pointer">
                            Consent Signed
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={d.preopChecklistCompleted === true}
                            onCheckedChange={(v) => set('preopChecklistCompleted', v === true)}
                            id="preopChecklistCompleted"
                            disabled={disabled}
                        />
                        <Label htmlFor="preopChecklistCompleted" className="text-sm font-normal cursor-pointer">
                            Pre-op Checklist Completed
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={d.whoChecklistCompleted === true}
                            onCheckedChange={(v) => set('whoChecklistCompleted', v === true)}
                            id="whoChecklistCompleted"
                            disabled={disabled}
                        />
                        <Label htmlFor="whoChecklistCompleted" className="text-sm font-normal cursor-pointer">
                            WHO Checklist Completed
                        </Label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Allergies</Label>
                    <Input
                        value={d.allergies || ''}
                        onChange={(e) => set('allergies', e.target.value)}
                        placeholder="List any allergies (NKDA if none)"
                        disabled={disabled}
                        className={d.allergies ? 'border-amber-500 bg-amber-50' : ''}
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">IV Status</Label>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={d.arrivedWithIv === true}
                                onCheckedChange={(v) => set('arrivedWithIv', v === true)}
                                id="arrivedWithIv"
                                disabled={disabled}
                            />
                            <Label htmlFor="arrivedWithIv" className="text-sm font-normal">
                                Arrived with IV infusing
                            </Label>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-slate-500">IV started by</Label>
                            <Input
                                value={d.ivStartedBy || ''}
                                onChange={(e) => set('ivStartedBy', e.target.value)}
                                placeholder="Name"
                                disabled={disabled}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-slate-500">Time</Label>
                            <Input
                                type="time"
                                value={d.ivStartTime || ''}
                                onChange={(e) => set('ivStartTime', e.target.value)}
                                disabled={disabled}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
