'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextField, TimeField } from '../fields';

interface EntrySectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function EntrySection({ data, onChange, disabled }: EntrySectionProps) {
    const d = data.entry ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, entry: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Arrival Method</Label>
                    <Select value={d.arrivalMethod || ''} onValueChange={(v) => set('arrivalMethod', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Method" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="STRETCHER">Stretcher</SelectItem>
                            <SelectItem value="WHEELCHAIR">Wheelchair</SelectItem>
                            <SelectItem value="WALKING">Walking</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <TimeField label="Time In" value={d.timeIn} onChange={(v) => set('timeIn', v)} disabled={disabled} />
                <div className="space-y-1.5">
                    <Label className="text-sm">ASA Class</Label>
                    <Select value={d.asaClass || ''} onValueChange={(v) => set('asaClass', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="ASA" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">ASA 1</SelectItem>
                            <SelectItem value="2">ASA 2</SelectItem>
                            <SelectItem value="3">ASA 3</SelectItem>
                            <SelectItem value="4">ASA 4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <TextField label="Allergies" value={d.allergies} onChange={(v) => set('allergies', v)} disabled={disabled} placeholder="Nil known / Specific allergies" />
            <TextField label="General Comments" value={d.comments} onChange={(v) => set('comments', v)} disabled={disabled} />
        </div>
    );
}
