'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { CaseReadinessStatus } from '@/domain/enums/CaseReadinessStatus';
import { CasePlanResponseDto } from '@/lib/api/case-plan';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface ClinicalPlanTabProps {
    casePlan?: CasePlanResponseDto | null;
    onSave: (data: any) => Promise<void>;
    saving?: boolean;
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

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Procedure Details - Primary Section */}
            <Card className="border-indigo-100 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-indigo-900">Procedure Strategy</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Primary Procedure</Label>
                            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select procedure..." />
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

                        <div className="space-y-2">
                            <Label className="text-slate-600">Planning Status</Label>
                            <Select
                                value={readinessStatus}
                                onValueChange={(v) => setReadinessStatus(v as CaseReadinessStatus)}
                            >
                                <SelectTrigger className={readinessStatus === CaseReadinessStatus.READY ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white"}>
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

                    <div className="space-y-2">
                        <Label className="text-slate-600 font-semibold">Procedure Plan / Description</Label>
                        <RichTextEditor
                            placeholder="Describe the surgical approach and technique..."
                            content={procedurePlan}
                            onChange={setProcedurePlan}
                            minHeight="250px"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Clinical Parameters */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle>Clinical Parameters</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-semibold">Risk Factors & Comorbidities</Label>
                        <RichTextEditor
                            placeholder="Allergies, previous scars, BMI considerations..."
                            content={riskFactors}
                            onChange={setRiskFactors}
                            minHeight="150px"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-semibold">Pre-operative Notes</Label>
                        <RichTextEditor
                            placeholder="Instructions for patient, specific clearance..."
                            content={preOpNotes}
                            onChange={setPreOpNotes}
                            minHeight="150px"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* OR Management Section (2 cols for editors if space permits, else stack) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle>Anesthesia & Nursing</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Anesthesia Plan</Label>
                            <RichTextEditor
                                placeholder="e.g. TIVA, General..."
                                content={anesthesiaPlan}
                                onChange={setAnesthesiaPlan}
                                minHeight="120px"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Special Instructions</Label>
                            <RichTextEditor
                                placeholder="Positioning, medications..."
                                content={specialInstructions}
                                onChange={setSpecialInstructions}
                                minHeight="120px"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle>Implants & Logistics</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Implant Specifications</Label>
                            <RichTextEditor
                                placeholder="Brand, Size, Profile, Catalog #..."
                                content={implantDetails}
                                onChange={setImplantDetails}
                                minHeight="300px"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving} className="min-w-[150px] gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Save Clinical Plan
                </Button>
            </div>
        </div>
    );
}
