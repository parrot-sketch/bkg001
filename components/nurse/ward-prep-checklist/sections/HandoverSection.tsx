'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimeField } from '../fields';
import { UserSelect } from '@/components/ui/user-select';

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
                <Label className="text-sm">Received by (name)</Label>
                <UserSelect
                    value={d.receivedByName || ''}
                    onChange={(value) => set('receivedByName', value)}
                    role="NURSE"
                    placeholder="Select receiving nurse..."
                    excludeCurrentUser={true}
                    currentUserId={currentUser?.id}
                />
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
