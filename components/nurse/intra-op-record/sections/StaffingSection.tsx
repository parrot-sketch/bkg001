'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserSelect } from '@/components/ui/UserSelect';
import { TextField } from '../fields';
import { Users } from 'lucide-react';

interface StaffingSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
    suggestedStaffing?: Record<string, string>;
}

export function StaffingSection({ data, onChange, disabled, suggestedStaffing }: StaffingSectionProps) {
    const d = data.staffing ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, staffing: { ...d, [field]: value } });

    const staffingEmpty =
        !d.surgeon && !d.assistant && !d.anaesthesiologist && !d.scrubNurse && !d.circulatingNurse;
    const hasAnySuggestion = suggestedStaffing &&
        Object.values(suggestedStaffing).some((v) => v && v.trim());
    const showImportBanner = !disabled && hasAnySuggestion && staffingEmpty;

    const handleImport = () => {
        if (!suggestedStaffing) return;
        onChange({
            ...data,
            staffing: {
                ...d,
                surgeon: suggestedStaffing.surgeon || d.surgeon || '',
                assistant: suggestedStaffing.assistant || d.assistant || '',
                anaesthesiologist: suggestedStaffing.anaesthesiologist || d.anaesthesiologist || '',
                scrubNurse: suggestedStaffing.scrubNurse || d.scrubNurse || '',
                circulatingNurse: suggestedStaffing.circulatingNurse || d.circulatingNurse || '',
            },
        });
    };

    return (
        <div className="space-y-4">
            {showImportBanner && (
                <div className="flex items-center justify-between gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-indigo-600 shrink-0" />
                        <div className="text-sm text-indigo-800 leading-tight">
                            <span className="font-semibold">Surgical plan team available.</span>
                            <span className="text-indigo-600 ml-1 text-xs">
                                Dr. {suggestedStaffing?.surgeon || '—'}{suggestedStaffing?.scrubNurse ? ` · Scrub: ${suggestedStaffing.scrubNurse}` : ''}
                            </span>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-100 text-xs h-7 px-2"
                        onClick={handleImport}
                    >
                        Import Team
                    </Button>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Surgeon</Label>
                    <UserSelect
                        value={d.surgeon || ''}
                        onChange={(v) => set('surgeon', v)}
                        placeholder="Select surgeon..."
                        role="DOCTOR"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Assistant</Label>
                    <UserSelect
                        value={d.assistant || ''}
                        onChange={(v) => set('assistant', v)}
                        placeholder="Select assistant..."
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Anaesthesiologist</Label>
                    <UserSelect
                        value={d.anaesthesiologist || ''}
                        onChange={(v) => set('anaesthesiologist', v)}
                        placeholder="Select anaesthesiologist..."
                        role="DOCTOR"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Scrub Nurse</Label>
                    <UserSelect
                        value={d.scrubNurse || ''}
                        onChange={(v) => set('scrubNurse', v)}
                        placeholder="Select scrub nurse..."
                        role="NURSE"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Circulating Nurse</Label>
                    <UserSelect
                        value={d.circulatingNurse || ''}
                        onChange={(v) => set('circulatingNurse', v)}
                        placeholder="Select circulating nurse..."
                        role="NURSE"
                        disabled={disabled}
                    />
                </div>
                <TextField label="Observers / Other" value={d.observers} onChange={(v) => set('observers', v)} disabled={disabled} />
            </div>
        </div>
    );
}
