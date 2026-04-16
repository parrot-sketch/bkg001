'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimeField } from '../fields';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface HandoverSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
    currentUser?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        id?: string;
    } | null;
}

export function HandoverSection({ data, onChange, disabled, currentUser }: HandoverSectionProps) {
    const d = data.handover ?? {};
    const set = (field: string, value: any) => onChange({ ...data, handover: { ...d, [field]: value } });

    const userName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
        : currentUser?.email || '';

    const nursingStaff = [
        { id: 'current', name: userName || 'Current Nurse' },
        { id: 'theater-nurse-1', name: 'Theater Nurse 1' },
        { id: 'theater-nurse-2', name: 'Theater Nurse 2' },
        { id: 'scrub-nurse-1', name: 'Scrub Nurse 1' },
        { id: 'scrub-nurse-2', name: 'Scrub Nurse 2' },
        { id: 'circulating-nurse', name: 'Circulating Nurse' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label className="text-sm">Prepared by (name)</Label>
                <Input
                    value={d.preparedByName || userName}
                    onChange={(e) => set('preparedByName', e.target.value)}
                    disabled={disabled}
                    placeholder={userName || "Enter name"}
                    className="h-9"
                />
            </div>
            <TimeField label="Time arrived in theatre" value={d.timeArrivedInTheatre} onChange={(v) => set('timeArrivedInTheatre', v)} disabled={disabled} />
            <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                    Received by (name)
                    <span className="text-xs text-muted-foreground font-normal">(optional - fill after theater booking)</span>
                </Label>
                <Select
                    value={d.receivedByName || ''}
                    onValueChange={(value) => set('receivedByName', value === '__none__' ? '' : value)}
                    disabled={disabled}
                >
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select receiving nurse..." />
                    </SelectTrigger>
                    <SelectContent className="z-50 max-h-60">
                        <SelectItem value="__none__">— Not yet assigned —</SelectItem>
                        {nursingStaff.map((staff) => (
                            <SelectItem key={staff.id} value={staff.name}>
                                {staff.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-sm">Handed over by (name)</Label>
                <Input
                    value={d.handedOverByName || userName}
                    onChange={(e) => set('handedOverByName', e.target.value)}
                    disabled={disabled}
                    placeholder={userName || "Enter name"}
                    className="h-9"
                />
            </div>
        </div>
    );
}