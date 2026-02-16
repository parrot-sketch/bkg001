'use client';

/**
 * Nurse Post-Operative Recovery / PACU Record Page
 *
 * Full-page clinical form for recovery nurse documentation.
 * Sections: Arrival & Baseline, Vitals Monitoring, Interventions, Discharge Readiness.
 *
 * Features:
 * - Explicit save (nurse clicks "Save Draft")
 * - Section-level completion indicators
 * - Vitals table editor with add/remove rows
 * - Discharge criteria checklist
 * - "Finalize Recovery Record" with validation
 * - Locked read-only view after finalization
 * - Patient header with allergy alerts
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import {
    useRecoveryRecord,
    useSaveRecoveryRecord,
    useFinalizeRecoveryRecord,
    RecoveryFinalizeValidationError,
} from '@/hooks/nurse/useRecoveryRecord';
import type {
    NurseRecoveryRecordDraft,
    VitalsObservation,
    MedicationItem,
    FluidItem,
    DrainItem,
} from '@/domain/clinical-forms/NurseRecoveryRecord';
import { RECOVERY_SECTIONS } from '@/domain/clinical-forms/NurseRecoveryRecord';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Save,
    Lock,
    Loader2,
    CheckCircle2,
    Circle,
    AlertTriangle,
    User2,
    ShieldAlert,
    HeartPulse,
    Activity,
    Syringe,
    ClipboardCheck,
    Plus,
    Trash2,
} from 'lucide-react';
import Link from 'next/link';

// ──────────────────────────────────────────────────────────────────────
// Icon Map
// ──────────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
    HeartPulse,
    Activity,
    Syringe,
    ClipboardCheck,
};

// ──────────────────────────────────────────────────────────────────────
// Field Components (reusable, data-driven)
// ──────────────────────────────────────────────────────────────────────

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
        <label className="flex items-center gap-3 cursor-pointer group">
            <input
                type="checkbox"
                checked={value ?? false}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
        </label>
    );
}

function NumberField({
    label,
    value,
    onChange,
    disabled,
    min,
    max,
    step,
    placeholder,
}: {
    label: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    disabled: boolean;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">{label}</Label>
            <Input
                type="number"
                value={value ?? ''}
                onChange={(e) =>
                    onChange(e.target.value === '' ? undefined : Number(e.target.value))
                }
                disabled={disabled}
                min={min}
                max={max}
                step={step ?? 1}
                placeholder={placeholder ?? ''}
                className="h-8 text-sm"
            />
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    disabled,
    placeholder,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    disabled: boolean;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">{label}</Label>
            <Input
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder ?? ''}
                className="h-8 text-sm"
            />
        </div>
    );
}

function SelectField({
    label,
    value,
    options,
    onChange,
    disabled,
    placeholder,
}: {
    label: string;
    value: string | undefined;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    disabled: boolean;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">{label}</Label>
            <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={placeholder ?? `Select ${label.toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────────────────────────────

export default function NurseRecoveryRecordPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const caseId = params?.caseId as string;

    const { data, isLoading, error: fetchError } = useRecoveryRecord(caseId);
    const saveMutation = useSaveRecoveryRecord(caseId);
    const finalizeMutation = useFinalizeRecoveryRecord(caseId);

    const [formData, setFormData] = useState<NurseRecoveryRecordDraft>({
        arrivalBaseline: {},
        vitalsMonitoring: {},
        interventions: {},
        dischargeReadiness: {},
    });
    const [isDirty, setIsDirty] = useState(false);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [nurseName, setNurseName] = useState('');

    const form = data?.form ?? null;
    const patient = data?.patient;
    const isLocked = form?.status === 'FINAL';
    const sectionCompletion = form?.sectionCompletion ?? {};

    // Sync form data from server
    useEffect(() => {
        if (form?.data) {
            setFormData(form.data as NurseRecoveryRecordDraft);
        }
    }, [form?.data]);

    // Update a nested field
    const updateSection = useCallback(
        <K extends keyof NurseRecoveryRecordDraft>(
            section: K,
            patch: Partial<NonNullable<NurseRecoveryRecordDraft[K]>>,
        ) => {
            setFormData((prev) => ({
                ...prev,
                [section]: { ...(prev[section] as any ?? {}), ...patch },
            }));
            setIsDirty(true);
        },
        [],
    );

    const handleSaveDraft = () => {
        saveMutation.mutate(formData, {
            onSuccess: () => setIsDirty(false),
        });
    };

    const handleFinalize = () => {
        // Inject nurse name into form data before finalize
        const updated = {
            ...formData,
            dischargeReadiness: {
                ...(formData.dischargeReadiness as any ?? {}),
                finalizedByName: nurseName,
            },
        };
        // Save with nurse name first, then finalize
        saveMutation.mutate(updated as NurseRecoveryRecordDraft, {
            onSuccess: () => {
                setIsDirty(false);
                finalizeMutation.mutate(undefined, {
                    onSuccess: () => {
                        setShowFinalizeDialog(false);
                    },
                });
            },
        });
    };

    // Compute progress
    const sectionKeys = RECOVERY_SECTIONS.map((s) => s.key);
    const completedSections = sectionKeys.filter(
        (k) => sectionCompletion[k]?.complete,
    ).length;
    const progressPercent = sectionKeys.length > 0
        ? Math.round((completedSections / sectionKeys.length) * 100)
        : 0;

    // ── Loading State ──
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    // ── Error State ──
    if (fetchError) {
        return (
            <div className="max-w-5xl mx-auto p-6">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6 text-center">
                        <ShieldAlert className="h-10 w-10 text-red-400 mx-auto mb-3" />
                        <h2 className="text-lg font-semibold text-red-800">Error Loading Recovery Record</h2>
                        <p className="text-sm text-red-600 mt-1">{fetchError.message}</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const arrival = (formData.arrivalBaseline ?? {}) as any;
    const vitals = (formData.vitalsMonitoring ?? {}) as any;
    const interventions = (formData.interventions ?? {}) as any;
    const discharge = (formData.dischargeReadiness ?? {}) as any;
    const criteria = discharge.dischargeCriteria ?? {};

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
            {/* ── Back Navigation ── */}
            <Link
                href="/nurse/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard
            </Link>

            {/* ── Patient Header Card ── */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white">
                                <User2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">
                                    {patient?.first_name} {patient?.last_name}
                                </h1>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {patient?.file_number && (
                                        <span className="text-xs text-muted-foreground">
                                            File #{patient.file_number}
                                        </span>
                                    )}
                                    {data?.procedureName && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {data.procedureName}
                                            {data.side ? ` (${data.side})` : ''}
                                        </Badge>
                                    )}
                                    {data?.surgeonName && (
                                        <span className="text-xs text-muted-foreground">
                                            Dr. {data.surgeonName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isLocked ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                    <Lock className="h-3 w-3" />
                                    Finalized
                                </Badge>
                            ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                    Draft
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                                {data?.caseStatus}
                            </Badge>
                        </div>
                    </div>

                    {/* Allergy Alert */}
                    {patient?.allergies && patient.allergies.trim().length > 0 && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-red-800">
                                    ALLERGIES
                                </p>
                                <p className="text-xs text-red-700 mt-0.5">{patient.allergies}</p>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">
                                Section Completion
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                                {completedSections}/{sectionKeys.length} ({progressPercent}%)
                            </span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                    </div>
                </CardContent>
            </Card>

            {/* ── Action Bar ── */}
            {!isLocked && (
                <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isDirty && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                Unsaved changes
                            </Badge>
                        )}
                        {saveMutation.isPending && (
                            <span className="flex items-center gap-1 text-cyan-600">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Saving…
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveDraft}
                            disabled={!isDirty || saveMutation.isPending}
                            className="text-xs h-8"
                        >
                            <Save className="h-3 w-3 mr-1.5" />
                            Save Draft
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setNurseName(user?.firstName ?? '');
                                setShowFinalizeDialog(true);
                            }}
                            disabled={saveMutation.isPending}
                            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                            Finalize Recovery Record
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Form Sections (Accordion) ── */}
            <Accordion
                type="multiple"
                defaultValue={sectionKeys}
                className="space-y-2"
            >
                {/* ═══ A) Arrival & Baseline ═══ */}
                <AccordionItem value="arrivalBaseline" className="border rounded-lg bg-white shadow-sm">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <SectionHeader
                            section={RECOVERY_SECTIONS[0]}
                            complete={sectionCompletion.arrivalBaseline?.complete ?? false}
                        />
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <TextField
                                label="Time Arrived in Recovery"
                                value={arrival.timeArrivedRecovery}
                                onChange={(v) => updateSection('arrivalBaseline', { timeArrivedRecovery: v } as any)}
                                disabled={isLocked}
                                placeholder="HH:MM"
                            />
                            <SelectField
                                label="Airway Status"
                                value={arrival.airwayStatus}
                                options={[
                                    { value: 'PATENT', label: 'Patent' },
                                    { value: 'ORAL_AIRWAY', label: 'Oral Airway' },
                                    { value: 'NASAL_AIRWAY', label: 'Nasal Airway' },
                                    { value: 'LMA_IN_SITU', label: 'LMA in situ' },
                                    { value: 'ETT_IN_SITU', label: 'ETT in situ' },
                                    { value: 'OTHER', label: 'Other' },
                                ]}
                                onChange={(v) => updateSection('arrivalBaseline', { airwayStatus: v } as any)}
                                disabled={isLocked}
                            />
                            <SelectField
                                label="Oxygen Delivery"
                                value={arrival.oxygenDelivery}
                                options={[
                                    { value: 'ROOM_AIR', label: 'Room Air' },
                                    { value: 'NASAL_CANNULA', label: 'Nasal Cannula' },
                                    { value: 'FACE_MASK', label: 'Face Mask' },
                                    { value: 'NON_REBREATHER', label: 'Non-Rebreather' },
                                    { value: 'VENTURI', label: 'Venturi Mask' },
                                    { value: 'OTHER', label: 'Other' },
                                ]}
                                onChange={(v) => updateSection('arrivalBaseline', { oxygenDelivery: v } as any)}
                                disabled={isLocked}
                            />
                            <TextField
                                label="O₂ Flow Rate"
                                value={arrival.oxygenFlowRate}
                                onChange={(v) => updateSection('arrivalBaseline', { oxygenFlowRate: v } as any)}
                                disabled={isLocked}
                                placeholder="e.g. 4L/min"
                            />
                            <SelectField
                                label="Consciousness Level"
                                value={arrival.consciousness}
                                options={[
                                    { value: 'ALERT', label: 'Alert' },
                                    { value: 'RESPONSIVE_TO_VOICE', label: 'Responsive to Voice' },
                                    { value: 'RESPONSIVE_TO_PAIN', label: 'Responsive to Pain' },
                                    { value: 'UNRESPONSIVE', label: 'Unresponsive' },
                                    { value: 'DROWSY', label: 'Drowsy' },
                                ]}
                                onChange={(v) => updateSection('arrivalBaseline', { consciousness: v } as any)}
                                disabled={isLocked}
                            />
                            <NumberField
                                label="Pain Score (0–10)"
                                value={arrival.painScore}
                                onChange={(v) => updateSection('arrivalBaseline', { painScore: v } as any)}
                                disabled={isLocked}
                                min={0}
                                max={10}
                            />
                            <SelectField
                                label="Nausea / Vomiting"
                                value={arrival.nauseaVomiting}
                                options={[
                                    { value: 'NONE', label: 'None' },
                                    { value: 'MILD_NAUSEA', label: 'Mild Nausea' },
                                    { value: 'MODERATE_NAUSEA', label: 'Moderate Nausea' },
                                    { value: 'VOMITING', label: 'Vomiting' },
                                    { value: 'SEVERE_VOMITING', label: 'Severe Vomiting' },
                                ]}
                                onChange={(v) => updateSection('arrivalBaseline', { nauseaVomiting: v } as any)}
                                disabled={isLocked}
                            />
                        </div>
                        <div className="mt-4">
                            <Label className="text-xs font-medium text-slate-600">Arrival Notes</Label>
                            <Textarea
                                value={arrival.arrivalNotes ?? ''}
                                onChange={(e) => updateSection('arrivalBaseline', { arrivalNotes: e.target.value } as any)}
                                disabled={isLocked}
                                placeholder="Additional notes on arrival..."
                                className="mt-1 text-sm min-h-[60px]"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* ═══ B) Vitals Monitoring ═══ */}
                <AccordionItem value="vitalsMonitoring" className="border rounded-lg bg-white shadow-sm">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <SectionHeader
                            section={RECOVERY_SECTIONS[1]}
                            complete={sectionCompletion.vitalsMonitoring?.complete ?? false}
                        />
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <VitalsTable
                            observations={vitals.observations ?? []}
                            onChange={(obs) => updateSection('vitalsMonitoring', { observations: obs } as any)}
                            disabled={isLocked}
                        />
                        <div className="mt-4">
                            <Label className="text-xs font-medium text-slate-600">
                                Reason if Vitals Not Recorded
                            </Label>
                            <Textarea
                                value={vitals.vitalsNotRecordedReason ?? ''}
                                onChange={(e) =>
                                    updateSection('vitalsMonitoring', { vitalsNotRecordedReason: e.target.value } as any)
                                }
                                disabled={isLocked}
                                placeholder="Explain if no vitals observations were taken (min 5 chars)..."
                                className="mt-1 text-sm min-h-[50px]"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* ═══ C) Interventions & Medications ═══ */}
                <AccordionItem value="interventions" className="border rounded-lg bg-white shadow-sm">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <SectionHeader
                            section={RECOVERY_SECTIONS[2]}
                            complete={sectionCompletion.interventions?.complete ?? false}
                        />
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-5">
                        {/* Medications */}
                        <ArraySection<MedicationItem>
                            title="Medications Given"
                            items={interventions.medications ?? []}
                            onChange={(items) => updateSection('interventions', { medications: items } as any)}
                            disabled={isLocked}
                            renderItem={(item, idx, onChange) => (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <TextField label="Name" value={item.name} onChange={(v) => onChange({ ...item, name: v })} disabled={isLocked} />
                                    <TextField label="Dose" value={item.dose} onChange={(v) => onChange({ ...item, dose: v })} disabled={isLocked} />
                                    <TextField label="Route" value={item.route} onChange={(v) => onChange({ ...item, route: v })} disabled={isLocked} placeholder="IV, IM, PO..." />
                                    <TextField label="Time" value={item.time} onChange={(v) => onChange({ ...item, time: v })} disabled={isLocked} placeholder="HH:MM" />
                                </div>
                            )}
                            emptyItem={{ name: '', dose: '', route: '', time: '' } as MedicationItem}
                        />

                        <Separator />

                        {/* Fluids */}
                        <ArraySection<FluidItem>
                            title="IV Fluids"
                            items={interventions.fluids ?? []}
                            onChange={(items) => updateSection('interventions', { fluids: items } as any)}
                            disabled={isLocked}
                            renderItem={(item, idx, onChange) => (
                                <div className="grid grid-cols-2 gap-2">
                                    <TextField label="Fluid Type" value={item.type} onChange={(v) => onChange({ ...item, type: v })} disabled={isLocked} />
                                    <NumberField label="Volume (mL)" value={item.volumeMl} onChange={(v) => onChange({ ...item, volumeMl: v ?? 0 })} disabled={isLocked} min={0} max={10000} />
                                </div>
                            )}
                            emptyItem={{ type: '', volumeMl: 0 } as FluidItem}
                        />

                        <Separator />

                        {/* Urine Output */}
                        <NumberField
                            label="Urine Output (mL)"
                            value={interventions.urineOutputMl}
                            onChange={(v) => updateSection('interventions', { urineOutputMl: v } as any)}
                            disabled={isLocked}
                            min={0}
                        />

                        <Separator />

                        {/* Drains */}
                        <ArraySection<DrainItem>
                            title="Drains"
                            items={interventions.drains ?? []}
                            onChange={(items) => updateSection('interventions', { drains: items } as any)}
                            disabled={isLocked}
                            renderItem={(item, idx, onChange) => (
                                <div className="grid grid-cols-3 gap-2">
                                    <TextField label="Type" value={item.type} onChange={(v) => onChange({ ...item, type: v })} disabled={isLocked} />
                                    <TextField label="Site" value={item.site} onChange={(v) => onChange({ ...item, site: v })} disabled={isLocked} />
                                    <NumberField label="Output (mL)" value={item.outputMl} onChange={(v) => onChange({ ...item, outputMl: v ?? 0 })} disabled={isLocked} min={0} max={5000} />
                                </div>
                            )}
                            emptyItem={{ type: '', site: '', outputMl: 0 } as DrainItem}
                        />

                        <Separator />

                        {/* Dressing + Notes */}
                        <TextField
                            label="Dressing Status"
                            value={interventions.dressingStatus}
                            onChange={(v) => updateSection('interventions', { dressingStatus: v } as any)}
                            disabled={isLocked}
                            placeholder="Intact, Oozing, Re-dressed..."
                        />
                        <div>
                            <Label className="text-xs font-medium text-slate-600">Intervention Notes</Label>
                            <Textarea
                                value={interventions.interventionNotes ?? ''}
                                onChange={(e) => updateSection('interventions', { interventionNotes: e.target.value } as any)}
                                disabled={isLocked}
                                placeholder="Additional notes..."
                                className="mt-1 text-sm min-h-[50px]"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* ═══ D) Discharge Readiness (GATE) ═══ */}
                <AccordionItem value="dischargeReadiness" className="border rounded-lg bg-white shadow-sm border-l-4 border-l-cyan-500">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <SectionHeader
                            section={RECOVERY_SECTIONS[3]}
                            complete={sectionCompletion.dischargeReadiness?.complete ?? false}
                        />
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-5">
                        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-cyan-800">
                                <ShieldAlert className="h-3.5 w-3.5 inline mr-1" />
                                Discharge Criteria — All must be met to allow RECOVERY → COMPLETED transition
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-700">Discharge Criteria Checklist</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <BooleanField
                                    label="Vitals Stable"
                                    value={criteria.vitalsStable}
                                    onChange={(v) =>
                                        updateSection('dischargeReadiness', {
                                            dischargeCriteria: { ...criteria, vitalsStable: v },
                                        } as any)
                                    }
                                    disabled={isLocked}
                                />
                                <BooleanField
                                    label="Pain Controlled"
                                    value={criteria.painControlled}
                                    onChange={(v) =>
                                        updateSection('dischargeReadiness', {
                                            dischargeCriteria: { ...criteria, painControlled: v },
                                        } as any)
                                    }
                                    disabled={isLocked}
                                />
                                <BooleanField
                                    label="Nausea Controlled"
                                    value={criteria.nauseaControlled}
                                    onChange={(v) =>
                                        updateSection('dischargeReadiness', {
                                            dischargeCriteria: { ...criteria, nauseaControlled: v },
                                        } as any)
                                    }
                                    disabled={isLocked}
                                />
                                <BooleanField
                                    label="Bleeding Controlled"
                                    value={criteria.bleedingControlled}
                                    onChange={(v) =>
                                        updateSection('dischargeReadiness', {
                                            dischargeCriteria: { ...criteria, bleedingControlled: v },
                                        } as any)
                                    }
                                    disabled={isLocked}
                                />
                                <BooleanField
                                    label="Airway Stable"
                                    value={criteria.airwayStable}
                                    onChange={(v) =>
                                        updateSection('dischargeReadiness', {
                                            dischargeCriteria: { ...criteria, airwayStable: v },
                                        } as any)
                                    }
                                    disabled={isLocked}
                                />
                            </div>
                        </div>

                        <Separator />

                        <SelectField
                            label="Discharge Decision"
                            value={discharge.dischargeDecision}
                            options={[
                                { value: 'DISCHARGE_TO_WARD', label: 'Discharge to Ward' },
                                { value: 'DISCHARGE_HOME', label: 'Discharge Home' },
                                { value: 'HOLD', label: 'Hold in Recovery' },
                            ]}
                            onChange={(v) =>
                                updateSection('dischargeReadiness', { dischargeDecision: v } as any)
                            }
                            disabled={isLocked}
                        />

                        <TextField
                            label="Discharge Time"
                            value={discharge.dischargeTime}
                            onChange={(v) => updateSection('dischargeReadiness', { dischargeTime: v } as any)}
                            disabled={isLocked}
                            placeholder="HH:MM"
                        />

                        <div>
                            <Label className="text-xs font-medium text-slate-600">Nurse Handover Notes</Label>
                            <Textarea
                                value={discharge.nurseHandoverNotes ?? ''}
                                onChange={(e) =>
                                    updateSection('dischargeReadiness', {
                                        nurseHandoverNotes: e.target.value,
                                    } as any)
                                }
                                disabled={isLocked}
                                placeholder="Handover details, instructions for receiving nurse/ward..."
                                className="mt-1 text-sm min-h-[80px]"
                            />
                        </div>

                        {/* Show finalized signature if locked */}
                        {isLocked && discharge.finalizedByName && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                <p className="text-xs text-emerald-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                                    <strong>Signed by:</strong> {discharge.finalizedByName}
                                    {discharge.finalizedAt && (
                                        <span className="ml-2 text-muted-foreground">
                                            at {new Date(discharge.finalizedAt).toLocaleString()}
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* ── Missing Items (when not locked) ── */}
            {!isLocked && sectionCompletion && (
                <MissingItemsSummary sectionCompletion={sectionCompletion} />
            )}

            {/* ── Finalize Dialog ── */}
            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Finalize Recovery Record
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            This will lock the record. Please enter your name to sign.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <Label className="text-xs font-medium">Nurse Name (Signature)</Label>
                            <Input
                                value={nurseName}
                                onChange={(e) => setNurseName(e.target.value)}
                                placeholder="Enter your full name"
                                className="mt-1 h-8 text-sm"
                            />
                        </div>
                        {finalizeMutation.isError && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                <p className="text-xs text-red-700">{finalizeMutation.error.message}</p>
                                {finalizeMutation.error instanceof RecoveryFinalizeValidationError && (
                                    <ul className="mt-1 space-y-0.5">
                                        {finalizeMutation.error.missingItems.map((item, i) => (
                                            <li key={i} className="text-[10px] text-red-600">• {item}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFinalizeDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            disabled={nurseName.trim().length < 2 || saveMutation.isPending || finalizeMutation.isPending}
                            onClick={handleFinalize}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {(saveMutation.isPending || finalizeMutation.isPending) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                                <Lock className="h-3.5 w-3.5 mr-1" />
                            )}
                            Sign & Finalize
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Section Header with completion indicator
// ──────────────────────────────────────────────────────────────────────

function SectionHeader({
    section,
    complete,
}: {
    section: typeof RECOVERY_SECTIONS[number];
    complete: boolean;
}) {
    const Icon = SECTION_ICONS[section.icon] ?? Activity;
    return (
        <div className="flex items-center gap-3 flex-1">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                complete
                    ? 'bg-emerald-100 text-emerald-700'
                    : section.isCritical
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
            }`}>
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>
            </div>
            {complete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
                <Circle className="h-4 w-4 text-slate-300" />
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Vitals Table Editor
// ──────────────────────────────────────────────────────────────────────

function VitalsTable({
    observations,
    onChange,
    disabled,
}: {
    observations: VitalsObservation[];
    onChange: (obs: VitalsObservation[]) => void;
    disabled: boolean;
}) {
    const addRow = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        onChange([
            ...observations,
            { time: `${hh}:${mm}`, bpSys: 120, bpDia: 80, pulse: 72, rr: 16, spo2: 98 },
        ]);
    };

    const updateRow = (idx: number, patch: Partial<VitalsObservation>) => {
        const updated = observations.map((o, i) => (i === idx ? { ...o, ...patch } : o));
        onChange(updated);
    };

    const removeRow = (idx: number) => {
        onChange(observations.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">
                    Vital Signs ({observations.length} observation{observations.length !== 1 ? 's' : ''})
                </h4>
                {!disabled && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addRow}
                        className="text-xs h-7"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Observation
                    </Button>
                )}
            </div>

            {observations.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-medium text-slate-600">
                                <th className="px-2 py-1.5 text-left">Time</th>
                                <th className="px-2 py-1.5 text-center">BP Sys</th>
                                <th className="px-2 py-1.5 text-center">BP Dia</th>
                                <th className="px-2 py-1.5 text-center">Pulse</th>
                                <th className="px-2 py-1.5 text-center">RR</th>
                                <th className="px-2 py-1.5 text-center">SpO₂</th>
                                <th className="px-2 py-1.5 text-center">Temp</th>
                                {!disabled && <th className="px-2 py-1.5 w-8"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {observations.map((obs, idx) => (
                                <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-1 py-1">
                                        <Input
                                            value={obs.time ?? ''}
                                            onChange={(e) => updateRow(idx, { time: e.target.value })}
                                            disabled={disabled}
                                            className="h-7 text-xs w-16"
                                            placeholder="HH:MM"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input
                                            type="number"
                                            value={obs.bpSys ?? ''}
                                            onChange={(e) => updateRow(idx, { bpSys: e.target.value ? Number(e.target.value) : undefined as any })}
                                            disabled={disabled}
                                            className="h-7 text-xs w-16 text-center"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input
                                            type="number"
                                            value={obs.bpDia ?? ''}
                                            onChange={(e) => updateRow(idx, { bpDia: e.target.value ? Number(e.target.value) : undefined as any })}
                                            disabled={disabled}
                                            className="h-7 text-xs w-16 text-center"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input
                                            type="number"
                                            value={obs.pulse ?? ''}
                                            onChange={(e) => updateRow(idx, { pulse: e.target.value ? Number(e.target.value) : undefined as any })}
                                            disabled={disabled}
                                            className="h-7 text-xs w-16 text-center"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input
                                            type="number"
                                            value={obs.rr ?? ''}
                                            onChange={(e) => updateRow(idx, { rr: e.target.value ? Number(e.target.value) : undefined as any })}
                                            disabled={disabled}
                                            className="h-7 text-xs w-14 text-center"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input
                                            type="number"
                                            value={obs.spo2 ?? ''}
                                            onChange={(e) => updateRow(idx, { spo2: e.target.value ? Number(e.target.value) : undefined as any })}
                                            disabled={disabled}
                                            className="h-7 text-xs w-14 text-center"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input
                                            type="number"
                                            value={obs.tempC ?? ''}
                                            onChange={(e) => updateRow(idx, { tempC: e.target.value ? Number(e.target.value) : undefined })}
                                            disabled={disabled}
                                            className="h-7 text-xs w-16 text-center"
                                            step={0.1}
                                        />
                                    </td>
                                    {!disabled && (
                                        <td className="px-1 py-1">
                                            <button
                                                onClick={() => removeRow(idx)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {observations.length === 0 && !disabled && (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                    <Activity className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No vitals observations yet.</p>
                    <Button variant="link" size="sm" onClick={addRow} className="text-xs mt-1">
                        Add first observation
                    </Button>
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Generic Array Section (for medications, fluids, drains)
// ──────────────────────────────────────────────────────────────────────

function ArraySection<T extends Record<string, any>>({
    title,
    items,
    onChange,
    disabled,
    renderItem,
    emptyItem,
}: {
    title: string;
    items: T[];
    onChange: (items: T[]) => void;
    disabled: boolean;
    renderItem: (item: T, index: number, onItemChange: (item: T) => void) => React.ReactNode;
    emptyItem: T;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">
                    {title} ({items.length})
                </h4>
                {!disabled && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onChange([...items, { ...emptyItem }])}
                        className="text-xs h-7"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                    </Button>
                )}
            </div>
            {items.map((item, idx) => (
                <div
                    key={idx}
                    className="relative border border-slate-200 rounded-lg p-3 bg-slate-50/50"
                >
                    {renderItem(item, idx, (updated) => {
                        const newItems = [...items];
                        newItems[idx] = updated;
                        onChange(newItems);
                    })}
                    {!disabled && (
                        <button
                            onClick={() => onChange(items.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Missing Items Summary
// ──────────────────────────────────────────────────────────────────────

function MissingItemsSummary({
    sectionCompletion,
}: {
    sectionCompletion: Record<string, { complete: boolean; errors: string[] }>;
}) {
    const incompleteSections = Object.entries(sectionCompletion).filter(
        ([, v]) => !v.complete && v.errors.length > 0,
    );

    if (incompleteSections.length === 0) return null;

    return (
        <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Items Needed for Finalization
                </h3>
                <div className="space-y-2">
                    {incompleteSections.map(([key, val]) => {
                        const section = RECOVERY_SECTIONS.find((s) => s.key === key);
                        return (
                            <div key={key}>
                                <p className="text-xs font-medium text-amber-700">
                                    {section?.title ?? key}
                                </p>
                                <ul className="ml-4 mt-0.5 space-y-0.5">
                                    {val.errors.slice(0, 5).map((err, i) => (
                                        <li key={i} className="text-[10px] text-amber-600">• {err}</li>
                                    ))}
                                    {val.errors.length > 5 && (
                                        <li className="text-[10px] text-amber-500">
                                            …and {val.errors.length - 5} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
