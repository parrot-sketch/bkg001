'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    Clock,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { CaseReadinessStatus } from '@/domain/enums/CaseReadinessStatus';
import { CasePlanResponseDto } from '@/lib/api/case-plan';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { cn } from '@/lib/utils';
import {
    parseImplantData,
    serializeImplantData,
    ImplantDevice,
    ImplantData,
} from '@/domain/helpers/implantTypes';
import { Trash2, Plus } from 'lucide-react';

const ANESTHESIA_TYPES = [
    { value: 'GENERAL', label: 'General Anesthesia' },
    { value: 'REGIONAL', label: 'Regional Anesthesia' },
    { value: 'LOCAL', label: 'Local Anesthesia' },
    { value: 'SEDATION', label: 'Sedation' },
    { value: 'TIVA', label: 'Total IV Anesthesia (TIVA)' },
    { value: 'MAC', label: 'Monitored Anesthesia Care (MAC)' },
];

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
    const [implantData, setImplantData] = useState<ImplantData>({ items: [], freeTextNotes: '' });
    const [anesthesiaPlan, setAnesthesiaPlan] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<string>('');
    const [readinessStatus, setReadinessStatus] = useState<CaseReadinessStatus>(CaseReadinessStatus.NOT_STARTED);

    useEffect(() => {
        if (casePlan) {
            setProcedurePlan(casePlan.procedurePlan || '');
            setRiskFactors(casePlan.riskFactors || '');
            setPreOpNotes(casePlan.preOpNotes || '');
            setImplantData(parseImplantData(casePlan.implantDetails));
            setAnesthesiaPlan(casePlan.anesthesiaPlan || '');
            setSpecialInstructions(casePlan.specialInstructions || '');
            setEstimatedDurationMinutes(
                (casePlan as any).estimatedDurationMinutes?.toString() || ''
            );
            setReadinessStatus(casePlan.readinessStatus as CaseReadinessStatus);
        }
    }, [casePlan]);

    const handleSave = () => {
        const durMinutes = estimatedDurationMinutes ? parseInt(estimatedDurationMinutes, 10) : null;
        onSave({
            procedurePlan: procedurePlan || services.find(s => s.id.toString() === selectedServiceId)?.service_name,
            procedureIds: selectedServiceId ? [parseInt(selectedServiceId)] : [],
            riskFactors,
            preOpNotes,
            implantDetails: serializeImplantData(implantData),
            anesthesiaPlan,
            specialInstructions,
            estimatedDurationMinutes: durMinutes && !isNaN(durMinutes) ? durMinutes : null,
            readinessStatus,
        });
    };

    // Helpers
    const hasContent = (val: string) => val.length > 0 && val !== '<p></p>';
    const hasImplants = implantData.items.length > 0 || (implantData.freeTextNotes?.length ?? 0) > 0;

    const addImplant = () => {
        const newItem: ImplantDevice = {
            id: crypto.randomUUID(),
            name: '',
            manufacturer: '',
            lotNumber: '',
            serialNumber: '',
            expiryDate: '',
            size: '',
            notes: '',
        };
        setImplantData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    };

    const updateImplant = (id: string, field: keyof ImplantDevice, value: string) => {
        setImplantData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            ),
        }));
    };

    const removeImplant = (id: string) => {
        setImplantData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id),
        }));
    };

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
                            <SectionStatus filled={!!anesthesiaPlan || hasContent(specialInstructions)} label="Anesthesia & OR Prep" />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Anesthesia Type</Label>
                                <Select value={anesthesiaPlan} onValueChange={setAnesthesiaPlan}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select anesthesia type…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ANESTHESIA_TYPES.map(a => (
                                            <SelectItem key={a.value} value={a.value}>
                                                {a.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        Estimated Duration (minutes)
                                    </div>
                                </Label>
                                <Input
                                    type="number"
                                    min={15}
                                    max={600}
                                    step={15}
                                    placeholder="e.g. 120"
                                    value={estimatedDurationMinutes}
                                    onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
                                    className="bg-background"
                                />
                                <p className="text-xs text-muted-foreground">15–600 min. Used for theater scheduling.</p>
                            </div>
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

                {/* Section 4: Implant/Device Tracking */}
                <AccordionItem value="implants" className="border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow">
                    <AccordionTrigger className="hover:no-underline py-3.5">
                        <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-violet-500 shrink-0" />
                            <SectionStatus filled={hasImplants} label={`Implants/Devices${implantData.items.length > 0 ? ` (${implantData.items.length})` : ''}`} />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Track implants and devices for surgical traceability. Include lot/serial numbers for regulatory compliance.
                        </p>

                        {/* Implant Items */}
                        {implantData.items.map((item, idx) => (
                            <div key={item.id} className="relative border rounded-lg p-4 space-y-3 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                                        Device #{idx + 1}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeImplant(item.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Device/Implant Name *</Label>
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateImplant(item.id, 'name', e.target.value)}
                                            placeholder="e.g. Mentor MemoryGel"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Manufacturer *</Label>
                                        <Input
                                            value={item.manufacturer}
                                            onChange={(e) => updateImplant(item.id, 'manufacturer', e.target.value)}
                                            placeholder="e.g. Mentor / Allergan"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Lot Number *</Label>
                                        <Input
                                            value={item.lotNumber}
                                            onChange={(e) => updateImplant(item.id, 'lotNumber', e.target.value)}
                                            placeholder="e.g. LOT-20260115-A"
                                            className="h-8 text-sm font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Serial Number</Label>
                                        <Input
                                            value={item.serialNumber ?? ''}
                                            onChange={(e) => updateImplant(item.id, 'serialNumber', e.target.value)}
                                            placeholder="Optional"
                                            className="h-8 text-sm font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Size / Model</Label>
                                        <Input
                                            value={item.size ?? ''}
                                            onChange={(e) => updateImplant(item.id, 'size', e.target.value)}
                                            placeholder="e.g. 350cc Moderate Plus"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Expiry Date</Label>
                                        <Input
                                            type="date"
                                            value={item.expiryDate ?? ''}
                                            onChange={(e) => updateImplant(item.id, 'expiryDate', e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-medium">Notes</Label>
                                    <Input
                                        value={item.notes ?? ''}
                                        onChange={(e) => updateImplant(item.id, 'notes', e.target.value)}
                                        placeholder="Any additional notes about this device"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        ))}

                        <Button variant="outline" size="sm" className="gap-2" onClick={addImplant}>
                            <Plus className="h-3.5 w-3.5" />
                            Add Implant / Device
                        </Button>

                        {/* Legacy free-text (preserved for backward compat) */}
                        {implantData.freeTextNotes && (
                            <div className="text-sm text-muted-foreground bg-muted/50 border rounded p-3 mt-2">
                                <p className="text-xs font-semibold mb-1">Legacy Notes (imported):</p>
                                <p className="whitespace-pre-wrap">{implantData.freeTextNotes}</p>
                            </div>
                        )}
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
