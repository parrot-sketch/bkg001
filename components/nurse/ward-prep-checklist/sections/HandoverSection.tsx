'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimeField } from '../fields';
import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { ServerSignatureDialog } from '@/components/nurse/ward-prep-checklist/components/ServerSignatureDialog';

export function HandoverSection({ data, onChange, disabled, currentUser, onPersistSignature }: WardChecklistSectionProps) {
    const d = data.handover ?? {};
    const set = (field: string, value: any) => onChange({ ...data, handover: { ...d, [field]: value } });

    const userName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
        : currentUser?.email || '';

    const [signTarget, setSignTarget] = useState<'PREPARED_BY' | 'RECEIVED_BY' | 'HANDED_OVER_BY' | null>(null);

    const openSignature = (target: NonNullable<typeof signTarget>) => setSignTarget(target);
    const closeSignature = () => setSignTarget(null);

    const handleSign = async (args: { signerName: string }) => {
        if (!signTarget) return;
        if (onPersistSignature) {
            await onPersistSignature({
                role: signTarget,
                value: { signerName: args.signerName, signatureDataUrl: '' },
            });
            return;
        }

        // Fallback: local-only update (requires manual "Save Draft" on the page)
        if (signTarget === 'PREPARED_BY') {
            onChange({
                ...data,
                handover: { ...d, preparedByName: args.signerName, preparedBySignature: { signerName: args.signerName, signatureDataUrl: '' } },
            });
        } else if (signTarget === 'RECEIVED_BY') {
            onChange({
                ...data,
                handover: { ...d, receivedByName: args.signerName, receivedBySignature: { signerName: args.signerName, signatureDataUrl: '' } },
            });
        } else {
            onChange({
                ...data,
                handover: { ...d, handedOverByName: args.signerName, handedOverBySignature: { signerName: args.signerName, signatureDataUrl: '' } },
            });
        }
    };

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
            <div className="space-y-1.5">
                <Label className="text-sm">Prepared by (signature)</Label>
                <div className="flex items-center gap-2">
                    {d.preparedBySignature?.signatureDataUrl ? (
                        <img
                            src={d.preparedBySignature.signatureDataUrl}
                            alt="Prepared by signature"
                            className="h-9 w-28 border border-slate-200 rounded-md bg-white object-contain"
                        />
                    ) : (
                        <div className="h-9 w-28 border border-dashed border-slate-200 rounded-md bg-slate-50" />
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl gap-2"
                        onClick={() => openSignature('PREPARED_BY')}
                        disabled={disabled}
                    >
                        <PenLine className="h-4 w-4" />
                        {d.preparedBySignature ? 'Re-sign' : 'Sign'}
                    </Button>
                </div>
            </div>
            <TimeField label="Time arrived in theatre" value={d.timeArrivedInTheatre} onChange={(v) => set('timeArrivedInTheatre', v)} disabled={disabled} />
            <div className="space-y-1.5">
                <Label className="text-sm">Received by (name)</Label>
                <Input
                    value={d.receivedByName || ''}
                    onChange={(e) => set('receivedByName', e.target.value)}
                    disabled={disabled}
                    placeholder="Enter name"
                    className="h-9"
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-sm">Received by (signature)</Label>
                <div className="flex items-center gap-2">
                    {d.receivedBySignature?.signatureDataUrl ? (
                        <img
                            src={d.receivedBySignature.signatureDataUrl}
                            alt="Received by signature"
                            className="h-9 w-28 border border-slate-200 rounded-md bg-white object-contain"
                        />
                    ) : (
                        <div className="h-9 w-28 border border-dashed border-slate-200 rounded-md bg-slate-50" />
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl gap-2"
                        onClick={() => openSignature('RECEIVED_BY')}
                        disabled={disabled}
                    >
                        <PenLine className="h-4 w-4" />
                        {d.receivedBySignature ? 'Re-sign' : 'Sign'}
                    </Button>
                </div>
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
            <div className="space-y-1.5">
                <Label className="text-sm">Handed over by (signature)</Label>
                <div className="flex items-center gap-2">
                    {d.handedOverBySignature?.signatureDataUrl ? (
                        <img
                            src={d.handedOverBySignature.signatureDataUrl}
                            alt="Handed over by signature"
                            className="h-9 w-28 border border-slate-200 rounded-md bg-white object-contain"
                        />
                    ) : (
                        <div className="h-9 w-28 border border-dashed border-slate-200 rounded-md bg-slate-50" />
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl gap-2"
                        onClick={() => openSignature('HANDED_OVER_BY')}
                        disabled={disabled}
                    >
                        <PenLine className="h-4 w-4" />
                        {d.handedOverBySignature ? 'Re-sign' : 'Sign'}
                    </Button>
                </div>
            </div>

            <ServerSignatureDialog
                open={signTarget !== null}
                onOpenChange={(v) => { if (!v) closeSignature(); }}
                title={
                    signTarget === 'PREPARED_BY'
                        ? 'Prepared By — Sign'
                        : signTarget === 'RECEIVED_BY'
                        ? 'Received By — Sign'
                        : 'Handed Over By — Sign'
                }
                defaultSignerName={
                    signTarget === 'RECEIVED_BY'
                        ? (d.receivedByName || '')
                        : signTarget === 'PREPARED_BY'
                        ? (d.preparedByName || userName)
                        : (d.handedOverByName || userName)
                }
                onSign={handleSign}
                disabled={disabled}
            />
        </div>
    );
}
