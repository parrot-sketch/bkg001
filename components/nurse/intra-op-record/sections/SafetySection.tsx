'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserSelect } from '@/components/ui/UserSelect';
import { CheckCircle } from 'lucide-react';

function BooleanField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: boolean | undefined;
    onChange: (v: boolean) => void;
    disabled: boolean;
}) {
    return (
        <div className="flex items-center gap-3 py-1.5">
            <Checkbox
                checked={!!value}
                onCheckedChange={(checked) => onChange(checked === true)}
                disabled={disabled}
                id={label}
            />
            <Label htmlFor={label} className="text-sm font-normal cursor-pointer">
                {label}
            </Label>
        </div>
    );
}

function TimeField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    disabled: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <Input
                type="time"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="h-9 max-w-[140px]"
            />
        </div>
    );
}

const ANTIBIOTIC_OPTIONS = [
    'Cefazolin',
    'Cefuroxime',
    'Metronidazole',
    'Vancomycin',
    'Gentamicin',
    'Clindamycin',
    'Amoxicillin-Clavulanate',
    'Other',
];

interface SafetySectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
    procedureName?: string;
    side?: string;
    verificationSources?: {
        patientIdVerified: string | null;
        informedConsentSigned: string | null;
        preOpChecklistCompleted: string | null;
    };
}

export function SafetySection({
    data,
    onChange,
    disabled,
    procedureName,
    side,
    verificationSources,
}: SafetySectionProps) {
    const d = data.safety ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, safety: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            {(procedureName || side) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Time-Out Verification</p>
                    <p className="text-sm font-semibold text-amber-900">
                        Goal: Confirm {procedureName || 'Procedure'} {side ? `on ${side.toUpperCase()} side` : ''}
                    </p>
                </div>
            )}

            {verificationSources && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Auto-Populated Verification</p>
                    <div className="space-y-1.5 text-xs text-indigo-700">
                        {verificationSources.patientIdVerified && (
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                <span><strong>ID Verified:</strong> {verificationSources.patientIdVerified}</span>
                            </div>
                        )}
                        {verificationSources.informedConsentSigned && (
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                <span><strong>Consent:</strong> {verificationSources.informedConsentSigned}</span>
                            </div>
                        )}
                        {verificationSources.preOpChecklistCompleted && (
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                <span><strong>Pre-op Checklist:</strong> {verificationSources.preOpChecklistCompleted}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-indigo-600 mt-2 italic">
                        You can override these values if needed. Changes will be logged.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <div>
                    <BooleanField label="Patient ID Verified with Reg No." value={d.patientIdVerified} onChange={(v) => set('patientIdVerified', v)} disabled={disabled} />
                    {verificationSources?.patientIdVerified && d.patientIdVerified && (
                        <p className="text-[10px] text-slate-500 mt-0.5 ml-7">{verificationSources.patientIdVerified}</p>
                    )}
                </div>
                <div>
                    <BooleanField label="Informed Consent Signed" value={d.informedConsentSigned} onChange={(v) => set('informedConsentSigned', v)} disabled={disabled} />
                    {verificationSources?.informedConsentSigned && d.informedConsentSigned && (
                        <p className="text-[10px] text-slate-500 mt-0.5 ml-7">{verificationSources.informedConsentSigned}</p>
                    )}
                </div>
                <div>
                    <BooleanField label="Pre-op Checklist Completed" value={d.preOpChecklistCompleted} onChange={(v) => set('preOpChecklistCompleted', v)} disabled={disabled} />
                    {verificationSources?.preOpChecklistCompleted && d.preOpChecklistCompleted && (
                        <p className="text-[10px] text-slate-500 mt-0.5 ml-7">{verificationSources.preOpChecklistCompleted}</p>
                    )}
                </div>
                <BooleanField label="WHO Checklist Completed" value={d.whoChecklistCompleted} onChange={(v) => set('whoChecklistCompleted', v)} disabled={disabled} />
                <BooleanField label="Arrived with IV infusing" value={d.arrivedWithIvInfusing} onChange={(v) => set('arrivedWithIvInfusing', v)} disabled={disabled} />
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">IV Started by</Label>
                    <UserSelect value={d.ivStartedBy || ''} onChange={(v) => set('ivStartedBy', v)} placeholder="Select staff..." disabled={disabled} />
                </div>
                <TimeField label="IV Start Time" value={d.ivStartTime} onChange={(v) => set('ivStartTime', v)} disabled={disabled} />
            </div>
            <Separator />
            <div className="space-y-3">
                <BooleanField label="Antibiotic ordered" value={d.antibioticOrdered} onChange={(v) => set('antibioticOrdered', v)} disabled={disabled} />
                {d.antibioticOrdered && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-8 animate-in slide-in-from-top-1">
                        <Select
                            value={d.antibioticType || ''}
                            onValueChange={(v) => set('antibioticType', v)}
                            disabled={disabled}
                        >
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent>
                                {ANTIBIOTIC_OPTIONS.map((a) => (
                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="space-y-1.5">
                            <Label className="text-sm">Ordered by</Label>
                            <UserSelect value={d.antibioticOrderedBy || ''} onChange={(v) => set('antibioticOrderedBy', v)} placeholder="Select staff..." disabled={disabled} />
                        </div>
                        <TimeField label="Time" value={d.antibioticTime} onChange={(v) => set('antibioticTime', v)} disabled={disabled} />
                    </div>
                )}
            </div>
        </div>
    );
}
