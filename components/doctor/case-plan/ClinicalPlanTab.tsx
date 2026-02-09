'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Loader2,
    Save,
    Stethoscope,
    ShieldAlert,
    Syringe,
    Package,
    CheckCircle2,
    Circle,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { CaseReadinessStatus } from '@/domain/enums/CaseReadinessStatus';
import { CasePlanResponseDto } from '@/lib/api/case-plan';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { cn } from '@/lib/utils';

interface ClinicalPlanTabProps {
    casePlan?: CasePlanResponseDto | null;
    onSave: (data: any) => Promise<void>;
    saving?: boolean;
}

// ─── Section status indicator ─────────────────────────────────────────
function SectionStatus({ filled, label }: { filled: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2">
            {filled ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className="font-semibold">{label}</span>
        </div>
    );
}

export function ClinicalPlanTab({ casePlan, onSave, saving }: ClinicalPlanTabProps) {
    const { services } = useServices();

    // Form State
    const [procedurePlan, setProcedurePlan] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [riskFactors, setRiskFactors] = useState('');
    const [preOpNotes, setPreOpNotes] = useState('');
    const [implantDetails, setImplantDetails] = useState('');
    const [anesthesiaPlan, setAnesthesiaPlan] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [readinessStatus, setReadinessStatus] = useState<CaseReadinessStatus>(CaseReadinessStatus.NOT_STARTED);

    useEffect(() => {
        if (casePlan) {
            setProcedurePlan(casePlan.procedurePlan || '');
            setRiskFactors(casePlan.riskFactors || '');
            setPreOpNotes(casePlan.preOpNotes || '');
            setImplantDetails(casePlan.implantDetails || '');
            setAnesthesiaPlan(casePlan.anesthesiaPlan || '');
            setSpecialInstructions(casePlan.specialInstructions || '');
            setReadinessStatus(casePlan.readinessStatus as CaseReadinessStatus);
        }
    }, [casePlan]);

    const handleSave = () => {
        onSave({
            procedurePlan: procedurePlan || services.find(s => s.id.toString() === selectedServiceId)?.service_name,
            procedureIds: selectedServiceId ? [parseInt(selectedServiceId)] : [],
            riskFactors,
            preOpNotes,
            implantDetails,
            anesthesiaPlan,
            specialInstructions,
            readinessStatus,
        });
    };

    // Helpers for checking content
    const hasContent = (val: string) => val.length > 0 && val !== '<p></p>';

    return (
        <div className="space-y-6 max-w-4xl">

            {/* ── Quick Selectors (always visible) ────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Primary Procedure
                    </Label>
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select procedure…" />
                        </SelectTrigger>
                        <SelectContent>
                            {services.map(service => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                    {service.service_name}
                                </SelectItem>
                            ))}
                            <SelectItem value="custom">Other / Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Planning Status
                    </Label>
                    <Select
                        value={readinessStatus}
                        onValueChange={(v) => setReadinessStatus(v as CaseReadinessStatus)}
                    >
                        <SelectTrigger
                            className={cn(
                                "bg-background",
                                readinessStatus === CaseReadinessStatus.READY &&
                                    "border-emerald-300 bg-emerald-50 text-emerald-700"
                            )}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={CaseReadinessStatus.NOT_STARTED}>Not Started</SelectItem>
                            <SelectItem value={CaseReadinessStatus.IN_PROGRESS}>In Progress</SelectItem>
                            <SelectItem value={CaseReadinessStatus.PENDING_LABS}>Pending Labs</SelectItem>
                            <SelectItem value={CaseReadinessStatus.PENDING_CONSENT}>Pending Consent</SelectItem>
                            <SelectItem value={CaseReadinessStatus.READY}>Ready for Surgery</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* ── Accordion Sections ──────────────────────────────── */}
            <Accordion
                type="multiple"
                defaultValue={['procedure']}
                className="space-y-3"
            >
                {/* Section 1: Procedure Plan */}
                <AccordionItem value="procedure" className="border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow">
                    <AccordionTrigger className="hover:no-underline py-3.5">
                        <div className="flex items-center gap-3">
                            <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                            <SectionStatus filled={hasContent(procedurePlan)} label="Procedure Plan" />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                        <p className="text-sm text-muted-foreground mb-3">
                            Describe the surgical approach, technique, and step-by-step plan.
                        </p>
                        <RichTextEditor
                            placeholder="Describe the surgical approach and technique…"
                            content={procedurePlan}
                            onChange={setProcedurePlan}
                            minHeight="200px"
                        />
                    </AccordionContent>
                </AccordionItem>

                {/* Section 2: Risk Assessment */}
                <AccordionItem value="risk" className="border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow">
                    <AccordionTrigger className="hover:no-underline py-3.5">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                            <SectionStatus filled={hasContent(riskFactors) || hasContent(preOpNotes)} label="Risk & Pre-op Assessment" />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-5">
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Risk Factors & Comorbidities</Label>
                            <RichTextEditor
                                placeholder="Allergies, previous scars, BMI considerations…"
                                content={riskFactors}
                                onChange={setRiskFactors}
                                minHeight="120px"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Pre-operative Notes</Label>
                            <RichTextEditor
                                placeholder="Instructions for patient, specific clearance…"
                                content={preOpNotes}
                                onChange={setPreOpNotes}
                                minHeight="120px"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Section 3: Anesthesia & OR Prep */}
                <AccordionItem value="anesthesia" className="border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow">
                    <AccordionTrigger className="hover:no-underline py-3.5">
                        <div className="flex items-center gap-3">
                            <Syringe className="h-4 w-4 text-blue-500 shrink-0" />
                            <SectionStatus filled={hasContent(anesthesiaPlan) || hasContent(specialInstructions)} label="Anesthesia & OR Prep" />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-5">
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Anesthesia Plan</Label>
                            <RichTextEditor
                                placeholder="e.g. TIVA, General, Local with sedation…"
                                content={anesthesiaPlan}
                                onChange={setAnesthesiaPlan}
                                minHeight="100px"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Special Instructions</Label>
                            <RichTextEditor
                                placeholder="Positioning, special medications, prep instructions…"
                                content={specialInstructions}
                                onChange={setSpecialInstructions}
                                minHeight="100px"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Section 4: Implant Specifications */}
                <AccordionItem value="implants" className="border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow">
                    <AccordionTrigger className="hover:no-underline py-3.5">
                        <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-violet-500 shrink-0" />
                            <SectionStatus filled={hasContent(implantDetails)} label="Implant Specifications" />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                        <p className="text-sm text-muted-foreground mb-3">
                            Brand, size, profile, catalog numbers, and any backup options.
                        </p>
                        <RichTextEditor
                            placeholder="Brand, Size, Profile, Catalog #…"
                            content={implantDetails}
                            onChange={setImplantDetails}
                            minHeight="150px"
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* ── Save Action ─────────────────────────────────────── */}
            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving} className="min-w-[160px] gap-2">
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    Save Clinical Plan
                </Button>
            </div>
        </div>
    );
}
