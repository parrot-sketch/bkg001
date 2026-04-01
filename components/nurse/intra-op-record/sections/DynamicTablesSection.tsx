'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { MedicationAdministrationList } from '@/components/nurse/MedicationAdministrationList';
import { ImplantSearchModal } from '@/components/nurse/ImplantSearchModal';
import { SpecimenSearchModal } from '@/components/nurse/SpecimenSearchModal';

interface DynamicTableSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
    caseId?: string;
    patient?: {
        first_name: string;
        last_name: string;
        file_number: string;
    };
    formResponseId?: string;
}

export function DynamicTableSection({ data, onChange, disabled, caseId, patient, formResponseId }: DynamicTableSectionProps) {
    const medications = Array.isArray(data.medications) ? data.medications : [];
    const implants = Array.isArray(data.implants) ? data.implants : [];
    const specimens = Array.isArray(data.specimens) ? data.specimens : [];

    const setMeds = (v: any[]) => onChange({ ...data, medications: v });
    const setImplants = (v: any[]) => onChange({ ...data, implants: v });
    const setSpecimens = (v: any[]) => onChange({ ...data, specimens: v });

    const [isImplantSearchOpen, setIsImplantSearchOpen] = useState(false);

    const handleImplantSelect = (implant: any) => {
        setImplants([...implants, {
            item: implant.name,
            lotNo: implant.available_lot_numbers?.[0] || '',
            size: implant.available_sizes?.[0] || '',
            inventoryItemId: implant.id,
            sku: implant.sku,
            unitCost: implant.unit_cost,
        }]);
        setIsImplantSearchOpen(false);
    };

    const [isSpecimenSearchOpen, setIsSpecimenSearchOpen] = useState(false);

    const handleSpecimenSelect = (specimen: any) => {
        setSpecimens([...specimens, {
            type: specimen.name,
            histology: false,
            cytology: false,
            notForAnalysis: false,
            disposition: '',
            inventoryItemId: specimen.id,
            sku: specimen.sku,
        }]);
        setIsSpecimenSearchOpen(false);
    };

    return (
        <div className="space-y-12">
            <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Medications</h4>
                {caseId && patient ? (
                    <MedicationAdministrationList
                        caseId={caseId}
                        patient={{
                            first_name: patient.first_name,
                            last_name: patient.last_name,
                            file_number: patient.file_number,
                        }}
                        formResponseId={formResponseId}
                        readOnly={disabled}
                    />
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 h-10">
                                <tr>
                                    <th className="px-3 font-medium text-left">Medication/Drug</th>
                                    <th className="px-3 font-medium text-left">Route</th>
                                    <th className="px-3 font-medium text-left w-32">Time</th>
                                    <th className="px-3 font-medium text-left w-32">Sign</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {medications.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="p-2"><Input value={item.drug} onChange={(e) => { const n = [...medications]; n[idx].drug = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                        <td className="p-2"><Input value={item.route} onChange={(e) => { const n = [...medications]; n[idx].route = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                        <td className="p-2"><Input type="time" value={item.time} onChange={(e) => { const n = [...medications]; n[idx].time = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                        <td className="p-2"><Input value={item.sign} onChange={(e) => { const n = [...medications]; n[idx].sign = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                        <td className="p-2"><Button variant="ghost" size="icon" onClick={() => setMeds(medications.filter((_: any, i: number) => i !== idx))} disabled={disabled}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                                    </tr>
                                ))}
                                {medications.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground italic">No medications recorded</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Surgical Implants / Prosthesis</h4>
                    {caseId ? (
                        <Button variant="outline" size="sm" onClick={() => setIsImplantSearchOpen(true)} disabled={disabled}>
                            <Plus className="h-4 w-4 mr-2" /> Search Inventory
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setImplants([...implants, { item: '', lotNo: '', size: '' }])} disabled={disabled}>
                            <Plus className="h-4 w-4 mr-2" /> Add Implant
                        </Button>
                    )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 h-10">
                            <tr>
                                <th className="px-3 font-medium text-left">Item</th>
                                <th className="px-3 font-medium text-left">Lot No.</th>
                                <th className="px-3 font-medium text-left">Size</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {implants.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="p-2"><Input value={item.item} onChange={(e) => { const n = [...implants]; n[idx].item = e.target.value; setImplants(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Input value={item.lotNo} onChange={(e) => { const n = [...implants]; n[idx].lotNo = e.target.value; setImplants(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Input value={item.size} onChange={(e) => { const n = [...implants]; n[idx].size = e.target.value; setImplants(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Button variant="ghost" size="icon" onClick={() => setImplants(implants.filter((_: any, i: number) => i !== idx))} disabled={disabled}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                                </tr>
                            ))}
                            {implants.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground italic">No implants recorded</td></tr>}
                        </tbody>
                    </table>
                </div>

                {caseId && (
                    <ImplantSearchModal
                        caseId={caseId}
                        isOpen={isImplantSearchOpen}
                        onClose={() => setIsImplantSearchOpen(false)}
                        onSelect={handleImplantSelect}
                    />
                )}

                {caseId && (
                    <SpecimenSearchModal
                        caseId={caseId}
                        isOpen={isSpecimenSearchOpen}
                        onClose={() => setIsSpecimenSearchOpen(false)}
                        onSelect={handleSpecimenSelect}
                    />
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Specimens</h4>
                    {caseId ? (
                        <Button variant="outline" size="sm" onClick={() => setIsSpecimenSearchOpen(true)} disabled={disabled}>
                            <Plus className="h-4 w-4 mr-2" /> Search Inventory
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setSpecimens([...specimens, { type: '', histology: false, cytology: false, notForAnalysis: false, disposition: '' }])} disabled={disabled}>
                            <Plus className="h-4 w-4 mr-2" /> Add Specimen
                        </Button>
                    )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 h-10">
                            <tr>
                                <th className="px-3 font-medium text-left">Type</th>
                                <th className="px-3 font-medium text-center">Hist</th>
                                <th className="px-3 font-medium text-center">Cyto</th>
                                <th className="px-3 font-medium text-center">N.A.</th>
                                <th className="px-3 font-medium text-left">Disposition</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {specimens.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="p-2"><Input value={item.type} onChange={(e) => { const n = [...specimens]; n[idx].type = e.target.value; setSpecimens(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2 text-center"><Checkbox checked={item.histology} onCheckedChange={(v) => { const n = [...specimens]; n[idx].histology = !!v; setSpecimens(n); }} disabled={disabled} /></td>
                                    <td className="p-2 text-center"><Checkbox checked={item.cytology} onCheckedChange={(v) => { const n = [...specimens]; n[idx].cytology = !!v; setSpecimens(n); }} disabled={disabled} /></td>
                                    <td className="p-2 text-center"><Checkbox checked={item.notForAnalysis} onCheckedChange={(v) => { const n = [...specimens]; n[idx].notForAnalysis = !!v; setSpecimens(n); }} disabled={disabled} /></td>
                                    <td className="p-2"><Input value={item.disposition} onChange={(e) => { const n = [...specimens]; n[idx].disposition = e.target.value; setSpecimens(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Button variant="ghost" size="icon" onClick={() => setSpecimens(specimens.filter((_: any, i: number) => i !== idx))} disabled={disabled}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                                </tr>
                            ))}
                            {specimens.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground italic">No specimens recorded</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
