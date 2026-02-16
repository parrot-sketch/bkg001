'use client';

/**
 * Surgeon Operative Note Page
 *
 * Full-page clinical form for the doctor-owned operative note.
 * Sections: Header, Findings & Steps, Metrics, Implants, Specimens,
 *           Complications, Counts Confirmation, Post-Op Plan.
 *
 * Features:
 * - Auto-prefilled from CasePlan + ProcedureRecord + Nurse IntraOpRecord
 * - "Import from Intra-Op Record" button (idempotent refresh)
 * - Section-level progress indicators
 * - Explicit save → "Finalize & Sign" with validation
 * - Locked read-only view after finalization
 * - Nurse count discrepancy enforcement
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import {
    useOperativeNote,
    useSaveOperativeNote,
    useFinalizeOperativeNote,
    useImportFromIntraOp,
    OperativeNoteFinalizeValidationError,
} from '@/hooks/doctor/useOperativeNote';
import type {
    SurgeonOperativeNoteDraft,
    OperativeNoteImplant,
    OperativeNoteSpecimen,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import { OPERATIVE_NOTE_SECTIONS } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
    FileText,
    Stethoscope,
    Activity,
    Package,
    FlaskConical,
    Hash,
    ClipboardCheck,
    Plus,
    Trash2,
    Printer,
    Download,
    ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// ──────────────────────────────────────────────────────────────────────
// Icon Map
// ──────────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
    FileText,
    Stethoscope,
    Activity,
    Package,
    FlaskConical,
    AlertTriangle,
    Hash,
    ClipboardCheck,
};

const ANESTHESIA_OPTIONS = [
    { value: 'GENERAL', label: 'General Anesthesia' },
    { value: 'REGIONAL', label: 'Regional Anesthesia' },
    { value: 'LOCAL', label: 'Local Anesthesia' },
    { value: 'SEDATION', label: 'Sedation' },
    { value: 'TIVA', label: 'Total IV Anesthesia (TIVA)' },
    { value: 'MAC', label: 'Monitored Anesthesia Care (MAC)' },
];

const DISCHARGE_OPTIONS = [
    { value: 'WARD', label: 'Ward' },
    { value: 'HOME', label: 'Home' },
    { value: 'ICU', label: 'ICU' },
    { value: 'HDU', label: 'HDU' },
    { value: 'OTHER', label: 'Other' },
];

// ──────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────

export default function OperativeNotePage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;
    const { user } = useAuth();

    const { data, isLoading, error } = useOperativeNote(caseId);
    const saveMutation = useSaveOperativeNote(caseId);
    const finalizeMutation = useFinalizeOperativeNote(caseId);
    const importMutation = useImportFromIntraOp(caseId);

    const [formData, setFormData] = useState<SurgeonOperativeNoteDraft | null>(null);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [finalizeError, setFinalizeError] = useState<string[] | null>(null);

    // Initialize form data from server
    useEffect(() => {
        if (data?.form?.data && !formData) {
            setFormData(data.form.data as SurgeonOperativeNoteDraft);
        }
    }, [data, formData]);

    const isFinalized = data?.form?.status === 'FINAL';
    const isReadOnly = isFinalized || user?.role !== 'DOCTOR';
    const nurseHasDiscrepancy = data?.nurseHasDiscrepancy ?? false;
    const sectionCompletion = data?.form?.sectionCompletion ?? {};

    // Section update helper
    const updateSection = useCallback(<K extends keyof SurgeonOperativeNoteDraft>(
        section: K,
        updates: Partial<SurgeonOperativeNoteDraft[K]>,
    ) => {
        setFormData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [section]: {
                    ...(prev[section] as Record<string, unknown> ?? {}),
                    ...updates,
                } as SurgeonOperativeNoteDraft[K],
            };
        });
    }, []);

    const handleSave = useCallback(() => {
        if (formData) saveMutation.mutate(formData);
    }, [formData, saveMutation]);

    const handleFinalize = useCallback(async () => {
        // Save first, then finalize
        if (formData) {
            try {
                await saveMutation.mutateAsync(formData);
            } catch {
                return;
            }
        }
        try {
            await finalizeMutation.mutateAsync();
            setShowFinalizeDialog(false);
            setFinalizeError(null);
        } catch (err) {
            if (err instanceof OperativeNoteFinalizeValidationError) {
                setFinalizeError(err.missingItems);
            }
        }
    }, [formData, saveMutation, finalizeMutation]);

    const handleImportFromIntraOp = useCallback(async () => {
        try {
            const result = await importMutation.mutateAsync();
            // Update local state with imported data
            if (result?.data) {
                setFormData(result.data as SurgeonOperativeNoteDraft);
            }
        } catch {
            // Error handled by mutation
        }
    }, [importMutation]);

    // Completion percentage
    const completedSections = Object.values(sectionCompletion).filter((s) => s.complete).length;
    const totalSections = OPERATIVE_NOTE_SECTIONS.length;
    const completionPct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                    {error?.message || 'Failed to load operative note'}
                </p>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    if (!data.form) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No operative note started yet</p>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    const patient = data.patient;
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                        <Link href={`/doctor/surgical-cases/${caseId}/plan`}>
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to Plan
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Operative Note</h1>
                        <p className="text-sm text-muted-foreground">
                            {patientName} — {data.procedureName || 'Procedure'} {data.side ? `(${data.side})` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isFinalized ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                            <Lock className="h-3 w-3" />
                            Finalized {data.form.signedAt ? format(new Date(data.form.signedAt), 'MMM d, HH:mm') : ''}
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="text-amber-700 bg-amber-50 border-amber-200">
                            Draft
                        </Badge>
                    )}
                </div>
            </div>

            {/* Discrepancy Warning */}
            {nurseHasDiscrepancy && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">Nurse Count Discrepancy</p>
                            <p className="text-xs text-red-700 mt-0.5">
                                The nurse intra-op record reports a count discrepancy. You cannot mark counts as correct.
                                An explanation is required.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Progress + Actions Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1 w-full">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Section Progress
                                </span>
                                <span className="text-xs font-bold text-slate-700">
                                    {completedSections}/{totalSections} ({completionPct}%)
                                </span>
                            </div>
                            <Progress value={completionPct} className="h-2" />
                            <div className="flex gap-1.5 mt-2">
                                {OPERATIVE_NOTE_SECTIONS.map((sec) => {
                                    const comp = sectionCompletion[sec.key];
                                    return (
                                        <div
                                            key={sec.key}
                                            className={`h-1.5 flex-1 rounded-full ${
                                                comp?.complete ? 'bg-emerald-500' : 'bg-slate-200'
                                            }`}
                                            title={`${sec.title}: ${comp?.complete ? 'Complete' : 'Incomplete'}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {!isReadOnly && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs"
                                        onClick={handleImportFromIntraOp}
                                        disabled={importMutation.isPending}
                                    >
                                        {importMutation.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Download className="h-3 w-3" />
                                        )}
                                        Import from Intra-Op
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs"
                                        onClick={handleSave}
                                        disabled={saveMutation.isPending}
                                    >
                                        {saveMutation.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Save className="h-3 w-3" />
                                        )}
                                        Save Draft
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="gap-1.5 text-xs"
                                        onClick={() => setShowFinalizeDialog(true)}
                                        disabled={finalizeMutation.isPending}
                                    >
                                        <Lock className="h-3 w-3" />
                                        Finalize & Sign
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                asChild
                            >
                                <Link href={`/doctor/surgical-cases/${caseId}/operative-note/print`}>
                                    <Printer className="h-3 w-3" />
                                    Print
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Form Sections */}
            <Accordion
                type="multiple"
                defaultValue={OPERATIVE_NOTE_SECTIONS.map((s) => s.key)}
                className="space-y-3"
            >
                {OPERATIVE_NOTE_SECTIONS.map((section) => {
                    const Icon = SECTION_ICONS[section.icon] ?? FileText;
                    const comp = sectionCompletion[section.key];

                    return (
                        <AccordionItem
                            key={section.key}
                            value={section.key}
                            className="border rounded-lg overflow-hidden"
                        >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-slate-50">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`p-1.5 rounded-md ${
                                        comp?.complete
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : section.isCritical
                                            ? 'bg-red-50 text-red-500'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-sm text-slate-800">{section.title}</span>
                                    {comp?.complete ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto mr-2" />
                                    ) : (
                                        <Circle className="h-4 w-4 text-slate-300 ml-auto mr-2" />
                                    )}
                                    {section.isCritical && !comp?.complete && (
                                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Required</Badge>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                {formData && (
                                    <SectionRenderer
                                        sectionKey={section.key}
                                        formData={formData}
                                        updateSection={updateSection}
                                        isReadOnly={isReadOnly}
                                        nurseHasDiscrepancy={nurseHasDiscrepancy}
                                    />
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {/* Finalize Dialog */}
            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finalize Operative Note</DialogTitle>
                        <DialogDescription>
                            This will lock the operative note and record your electronic signature.
                            Ensure all sections are complete and accurate.
                        </DialogDescription>
                    </DialogHeader>

                    {finalizeError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                            <p className="text-sm font-semibold text-red-800">Missing Items:</p>
                            <ul className="text-xs text-red-700 space-y-0.5 max-h-40 overflow-y-auto">
                                {finalizeError.map((item, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setShowFinalizeDialog(false); setFinalizeError(null); }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFinalize}
                            disabled={finalizeMutation.isPending}
                            className="gap-1.5"
                        >
                            {finalizeMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Lock className="h-4 w-4" />
                            )}
                            Finalize & Sign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Section Renderer
// ──────────────────────────────────────────────────────────────────────

function SectionRenderer({
    sectionKey,
    formData,
    updateSection,
    isReadOnly,
    nurseHasDiscrepancy,
}: {
    sectionKey: string;
    formData: SurgeonOperativeNoteDraft;
    updateSection: <K extends keyof SurgeonOperativeNoteDraft>(
        section: K,
        updates: Partial<SurgeonOperativeNoteDraft[K]>,
    ) => void;
    isReadOnly: boolean;
    nurseHasDiscrepancy: boolean;
}) {
    switch (sectionKey) {
        case 'header':
            return <HeaderSection data={formData.header ?? {}} onChange={(u) => updateSection('header', u)} disabled={isReadOnly} />;
        case 'findingsAndSteps':
            return <FindingsSection data={formData.findingsAndSteps ?? {}} onChange={(u) => updateSection('findingsAndSteps', u)} disabled={isReadOnly} />;
        case 'intraOpMetrics':
            return <MetricsSection data={formData.intraOpMetrics ?? {}} onChange={(u) => updateSection('intraOpMetrics', u)} disabled={isReadOnly} />;
        case 'implantsUsed':
            return <ImplantsSection data={formData.implantsUsed ?? {}} onChange={(u) => updateSection('implantsUsed', u)} disabled={isReadOnly} />;
        case 'specimens':
            return <SpecimensSection data={formData.specimens ?? {}} onChange={(u) => updateSection('specimens', u)} disabled={isReadOnly} />;
        case 'complications':
            return <ComplicationsSection data={formData.complications ?? {}} onChange={(u) => updateSection('complications', u)} disabled={isReadOnly} />;
        case 'countsConfirmation':
            return <CountsSection data={formData.countsConfirmation ?? {}} onChange={(u) => updateSection('countsConfirmation', u)} disabled={isReadOnly} nurseHasDiscrepancy={nurseHasDiscrepancy} />;
        case 'postOpPlan':
            return <PostOpPlanSection data={formData.postOpPlan ?? {}} onChange={(u) => updateSection('postOpPlan', u)} disabled={isReadOnly} />;
        default:
            return <p className="text-sm text-muted-foreground">Unknown section</p>;
    }
}

// ──────────────────────────────────────────────────────────────────────
// A) Header Section
// ──────────────────────────────────────────────────────────────────────

function HeaderSection({
    data,
    onChange,
    disabled,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Pre-Operative Diagnosis *</Label>
                    <Input
                        value={data.diagnosisPreOp ?? ''}
                        onChange={(e) => onChange({ diagnosisPreOp: e.target.value })}
                        disabled={disabled}
                        placeholder="Pre-operative diagnosis"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Post-Operative Diagnosis</Label>
                    <Input
                        value={data.diagnosisPostOp ?? ''}
                        onChange={(e) => onChange({ diagnosisPostOp: e.target.value })}
                        disabled={disabled}
                        placeholder="Post-operative diagnosis (if different)"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Procedure Performed *</Label>
                    <Input
                        value={data.procedurePerformed ?? ''}
                        onChange={(e) => onChange({ procedurePerformed: e.target.value })}
                        disabled={disabled}
                        placeholder="Procedure name"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Laterality / Side</Label>
                    <Input
                        value={data.side ?? ''}
                        onChange={(e) => onChange({ side: e.target.value })}
                        disabled={disabled}
                        placeholder="Left / Right / Bilateral / N/A"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Anesthesia Type *</Label>
                    <Select
                        value={data.anesthesiaType ?? ''}
                        onValueChange={(v) => onChange({ anesthesiaType: v })}
                        disabled={disabled}
                    >
                        <SelectTrigger><SelectValue placeholder="Select anesthesia type" /></SelectTrigger>
                        <SelectContent>
                            {ANESTHESIA_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Surgeon</Label>
                    <Input value={data.surgeonName ?? ''} disabled className="bg-slate-50" />
                </div>
            </div>

            {/* Assistants (read-only prefill display) */}
            {data.assistants && data.assistants.length > 0 && (
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Assistants</Label>
                    <div className="flex flex-wrap gap-2">
                        {data.assistants.map((a: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                                {a.name} {a.role ? `(${a.role.replace(/_/g, ' ')})` : ''}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// B) Findings & Operative Steps
// ──────────────────────────────────────────────────────────────────────

function FindingsSection({
    data,
    onChange,
    disabled,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Intra-Operative Findings</Label>
                <Textarea
                    value={data.findings ?? ''}
                    onChange={(e) => onChange({ findings: e.target.value })}
                    disabled={disabled}
                    placeholder="Describe findings (pathology, anatomy, unexpected observations...)"
                    rows={4}
                    className="resize-y"
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Operative Steps / Description *</Label>
                <Textarea
                    value={data.operativeSteps ?? ''}
                    onChange={(e) => onChange({ operativeSteps: e.target.value })}
                    disabled={disabled}
                    placeholder="Detailed step-by-step account of the procedure (min 20 chars)..."
                    rows={8}
                    className="resize-y"
                />
                <p className="text-[10px] text-muted-foreground">
                    Minimum 20 characters required. Must contain meaningful clinical content.
                </p>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// C) Intra-Op Metrics
// ──────────────────────────────────────────────────────────────────────

function MetricsSection({
    data,
    onChange,
    disabled,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
}) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold">EBL (mL) *</Label>
                <Input
                    type="number"
                    value={data.estimatedBloodLossMl ?? ''}
                    onChange={(e) => onChange({ estimatedBloodLossMl: e.target.value ? Number(e.target.value) : undefined })}
                    disabled={disabled}
                    placeholder="0"
                    min={0}
                    max={20000}
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Fluids Given (mL)</Label>
                <Input
                    type="number"
                    value={data.fluidsGivenMl ?? ''}
                    onChange={(e) => onChange({ fluidsGivenMl: e.target.value ? Number(e.target.value) : undefined })}
                    disabled={disabled}
                    placeholder="0"
                    min={0}
                    max={50000}
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Urine Output (mL)</Label>
                <Input
                    type="number"
                    value={data.urineOutputMl ?? ''}
                    onChange={(e) => onChange({ urineOutputMl: e.target.value ? Number(e.target.value) : undefined })}
                    disabled={disabled}
                    placeholder="0"
                    min={0}
                    max={10000}
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tourniquet (min)</Label>
                <Input
                    type="number"
                    value={data.tourniquetTimeMinutes ?? ''}
                    onChange={(e) => onChange({ tourniquetTimeMinutes: e.target.value ? Number(e.target.value) : undefined })}
                    disabled={disabled}
                    placeholder="0"
                    min={0}
                    max={300}
                />
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// D) Implants Used
// ──────────────────────────────────────────────────────────────────────

function ImplantsSection({
    data,
    onChange,
    disabled,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
}) {
    const items: OperativeNoteImplant[] = data.implantsUsed ?? [];

    const addItem = () => {
        onChange({
            implantsUsed: [
                ...items,
                { name: '', manufacturer: '', lotNumber: '', serialNumber: '', expiryDate: '' },
            ],
        });
    };

    const removeItem = (index: number) => {
        onChange({ implantsUsed: items.filter((_, i) => i !== index) });
    };

    const updateItem = (index: number, field: string, value: string) => {
        const updated = items.map((item, i) =>
            i === index ? { ...item, [field]: value } : item,
        );
        onChange({ implantsUsed: updated });
    };

    return (
        <div className="space-y-3">
            {items.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No implants recorded</p>
            )}
            {items.map((item, idx) => (
                <Card key={idx} className="border-slate-200">
                    <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-500">Implant #{idx + 1}</span>
                            {!disabled && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeItem(idx)}>
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px]">Name *</Label>
                                <Input value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} disabled={disabled} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Manufacturer</Label>
                                <Input value={item.manufacturer ?? ''} onChange={(e) => updateItem(idx, 'manufacturer', e.target.value)} disabled={disabled} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Lot #</Label>
                                <Input value={item.lotNumber ?? ''} onChange={(e) => updateItem(idx, 'lotNumber', e.target.value)} disabled={disabled} className="h-8 text-xs font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Serial #</Label>
                                <Input value={item.serialNumber ?? ''} onChange={(e) => updateItem(idx, 'serialNumber', e.target.value)} disabled={disabled} className="h-8 text-xs font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Expiry Date</Label>
                                <Input type="date" value={item.expiryDate ?? ''} onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)} disabled={disabled} className="h-8 text-xs" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            {!disabled && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addItem}>
                    <Plus className="h-3 w-3" />
                    Add Implant
                </Button>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// E) Specimens
// ──────────────────────────────────────────────────────────────────────

function SpecimensSection({
    data,
    onChange,
    disabled,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
}) {
    const items: OperativeNoteSpecimen[] = data.specimens ?? [];

    const addItem = () => {
        onChange({
            specimens: [
                ...items,
                { type: '', site: '', destinationLab: '', timeSent: '' },
            ],
        });
    };

    const removeItem = (index: number) => {
        onChange({ specimens: items.filter((_, i) => i !== index) });
    };

    const updateItem = (index: number, field: string, value: string) => {
        const updated = items.map((item, i) =>
            i === index ? { ...item, [field]: value } : item,
        );
        onChange({ specimens: updated });
    };

    return (
        <div className="space-y-3">
            {items.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No specimens recorded</p>
            )}
            {items.map((item, idx) => (
                <Card key={idx} className="border-slate-200">
                    <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-500">Specimen #{idx + 1}</span>
                            {!disabled && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeItem(idx)}>
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px]">Type *</Label>
                                <Input value={item.type} onChange={(e) => updateItem(idx, 'type', e.target.value)} disabled={disabled} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Site *</Label>
                                <Input value={item.site} onChange={(e) => updateItem(idx, 'site', e.target.value)} disabled={disabled} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Destination Lab *</Label>
                                <Input value={item.destinationLab} onChange={(e) => updateItem(idx, 'destinationLab', e.target.value)} disabled={disabled} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Time Sent</Label>
                                <Input type="time" value={item.timeSent ?? ''} onChange={(e) => updateItem(idx, 'timeSent', e.target.value)} disabled={disabled} className="h-8 text-xs" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            {!disabled && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addItem}>
                    <Plus className="h-3 w-3" />
                    Add Specimen
                </Button>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// F) Complications
// ──────────────────────────────────────────────────────────────────────

function ComplicationsSection({
    data,
    onChange,
    disabled,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
}) {
    const occurred = data.complicationsOccurred === true;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Checkbox
                    checked={occurred}
                    onCheckedChange={(checked) => onChange({ complicationsOccurred: checked === true })}
                    disabled={disabled}
                    id="complications-occurred"
                />
                <Label htmlFor="complications-occurred" className="text-sm font-medium">
                    Complications occurred during the procedure
                </Label>
            </div>

            {occurred && (
                <div className="space-y-1.5 ml-6">
                    <Label className="text-xs font-semibold text-red-700">Complications Details *</Label>
                    <Textarea
                        value={data.complicationsDetails ?? ''}
                        onChange={(e) => onChange({ complicationsDetails: e.target.value })}
                        disabled={disabled}
                        placeholder="Describe complications (min 5 chars)..."
                        rows={3}
                        className="border-red-200 focus:border-red-400"
                    />
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// G) Counts Confirmation
// ──────────────────────────────────────────────────────────────────────

function CountsSection({
    data,
    onChange,
    disabled,
    nurseHasDiscrepancy,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
    nurseHasDiscrepancy: boolean;
}) {
    const countsCorrect = data.countsCorrect === true;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Checkbox
                    checked={countsCorrect}
                    onCheckedChange={(checked) => {
                        if (nurseHasDiscrepancy && checked) return; // Block marking correct if nurse discrepancy
                        onChange({ countsCorrect: checked === true });
                    }}
                    disabled={disabled || nurseHasDiscrepancy}
                    id="counts-correct"
                />
                <Label htmlFor="counts-correct" className="text-sm font-medium">
                    All counts confirmed correct
                </Label>
                {nurseHasDiscrepancy && (
                    <Badge variant="destructive" className="text-[10px]">
                        Nurse Discrepancy
                    </Badge>
                )}
            </div>

            {(!countsCorrect || nurseHasDiscrepancy) && (
                <div className="space-y-1.5 ml-6">
                    <Label className="text-xs font-semibold text-red-700">Explanation *</Label>
                    <Textarea
                        value={data.countsExplanation ?? ''}
                        onChange={(e) => onChange({ countsExplanation: e.target.value })}
                        disabled={disabled}
                        placeholder="Explain count discrepancy or reason counts are not confirmed (min 5 chars)..."
                        rows={3}
                        className="border-red-200 focus:border-red-400"
                    />
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// H) Post-Op Plan
// ──────────────────────────────────────────────────────────────────────

function PostOpPlanSection({
    data,
    onChange,
    disabled,
}: {
    data: Record<string, any>;
    onChange: (u: Record<string, any>) => void;
    disabled: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Dressing Instructions</Label>
                    <Textarea
                        value={data.dressingInstructions ?? ''}
                        onChange={(e) => onChange({ dressingInstructions: e.target.value })}
                        disabled={disabled}
                        placeholder="Dressing type, change schedule..."
                        rows={2}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Drain Care</Label>
                    <Textarea
                        value={data.drainCare ?? ''}
                        onChange={(e) => onChange({ drainCare: e.target.value })}
                        disabled={disabled}
                        placeholder="Drain type, removal criteria..."
                        rows={2}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Medications / Prescriptions</Label>
                    <Textarea
                        value={data.meds ?? ''}
                        onChange={(e) => onChange({ meds: e.target.value })}
                        disabled={disabled}
                        placeholder="Post-op medications, antibiotics, pain management..."
                        rows={2}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Follow-Up Plan</Label>
                    <Textarea
                        value={data.followUpPlan ?? ''}
                        onChange={(e) => onChange({ followUpPlan: e.target.value })}
                        disabled={disabled}
                        placeholder="Follow-up visit, wound check, imaging..."
                        rows={2}
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Discharge Destination</Label>
                <Select
                    value={data.dischargeDestination ?? ''}
                    onValueChange={(v) => onChange({ dischargeDestination: v })}
                    disabled={disabled}
                >
                    <SelectTrigger className="w-48"><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent>
                        {DISCHARGE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
