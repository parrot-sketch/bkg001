'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, UserCheck, AlertTriangle } from 'lucide-react';

interface TimingsSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled?: boolean;
}

export function TimingsSection({ data, onChange, disabled }: TimingsSectionProps) {
    const d = data.timings ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, timings: { ...d, [field]: value } });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">Theatre Timing & Safety</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Time In Theatre</Label>
                    <Input
                        type="time"
                        value={d.timeInTheatre || ''}
                        onChange={(e) => set('timeInTheatre', e.target.value)}
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Time Out Theatre</Label>
                    <Input
                        type="time"
                        value={d.timeOutTheatre || ''}
                        onChange={(e) => set('timeOutTheatre', e.target.value)}
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Operation Start</Label>
                    <Input
                        type="time"
                        value={d.operationStart || ''}
                        onChange={(e) => set('operationStart', e.target.value)}
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Operation Finish</Label>
                    <Input
                        type="time"
                        value={d.operationFinish || ''}
                        onChange={(e) => set('operationFinish', e.target.value)}
                        disabled={disabled}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-slate-500">Safety Checks</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-2">
                        <Label className="text-sm">Safety Belt Applied</Label>
                        <Select value={d.safetyBeltApplied?.toString() || ''} onValueChange={(v) => set('safetyBeltApplied', v === 'true')} disabled={disabled}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                        </Select>
                        {d.safetyBeltApplied && (
                            <Input
                                value={d.safetyBeltPosition || ''}
                                onChange={(e) => set('safetyBeltPosition', e.target.value)}
                                placeholder="Position"
                                disabled={disabled}
                                className="mt-2"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm">Arms Secured</Label>
                        <Select value={d.armsSecured?.toString() || ''} onValueChange={(v) => set('armsSecured', v === 'true')} disabled={disabled}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                        </Select>
                        {d.armsSecured && (
                            <Input
                                value={d.armsSecuredPosition || ''}
                                onChange={(e) => set('armsSecuredPosition', e.target.value)}
                                placeholder="Position"
                                disabled={disabled}
                                className="mt-2"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm">Alignment Correct</Label>
                        <Select value={d.alignmentCorrect?.toString() || ''} onValueChange={(v) => set('alignmentCorrect', v === 'true')} disabled={disabled}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Pressure Points / Notes</Label>
                    <Input
                        value={d.pressurePointsNotes || ''}
                        onChange={(e) => set('pressurePointsNotes', e.target.value)}
                        placeholder="Any pressure points or special notes"
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}
