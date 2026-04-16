'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { nurseFormsApi, MedicationSearchItem } from '@/lib/api/nurse-forms';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pill, CheckCircle2, Save, Clock, DollarSign, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface AdministerMedicationDialogProps {
    caseId: string;
    formResponseId?: string;
    medication: MedicationSearchItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AdministerMedicationDialog({ caseId, formResponseId, medication, isOpen, onClose, onSuccess }: AdministerMedicationDialogProps) {
    const [doseValue, setDoseValue] = useState<number>(1);
    const [doseUnit, setDoseUnit] = useState('');
    const [billingQuantity, setBillingQuantity] = useState<number>(1);
    const [manualPrice, setManualPrice] = useState<number | ''>('');
    const [route, setRoute] = useState('IV');
    const [timeGiven, setTimeGiven] = useState(new Date().toTimeString().slice(0, 5));
    const [notes, setNotes] = useState('');

    const defaultUnitCost = medication?.unit_cost ?? 0;
    const manualUnitCost = manualPrice === '' ? 0 : Number(manualPrice);
    const unitCost = defaultUnitCost > 0 ? defaultUnitCost : manualUnitCost;
    const isItemBillable = medication?.is_billable ?? true;
    const canCharge = isItemBillable && unitCost > 0;
    const effectiveUnitCost = unitCost;
    const calculatedTotal = useMemo(() => billingQuantity * effectiveUnitCost, [billingQuantity, effectiveUnitCost]);

    useEffect(() => {
        if (medication) {
            setDoseUnit(medication.unit_of_measure);
            setDoseValue(1);
            setBillingQuantity(1);
            setManualPrice('');
        }
    }, [medication]);

    const adminMutation = useMutation({
        mutationFn: (administerNow: boolean) =>
            nurseFormsApi.administerMedication(caseId, {
                inventoryItemId: medication?.id,
                name: medication?.name,
                doseValue,
                doseUnit,
                route,
                notes,
                formResponseId,
                billingQuantity: canCharge ? billingQuantity : undefined,
                unitCost: canCharge ? effectiveUnitCost : undefined,
                administerNow,
                administeredAt: administerNow ? `${new Date().toISOString().split('T')[0]}T${timeGiven}:00Z` : undefined
            }),
        onSuccess: (data) => {
            if (data.success) {
                toast.success(data.message || 'Action completed');
                onSuccess();
            } else {
                toast.error(data.error || 'Failed to record medication');
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'An error occurred');
        }
    });

    if (!medication) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pill className="h-5 w-5 text-indigo-500" />
                        Record Medication
                    </DialogTitle>
                    <DialogDescription>
                        {medication.name} ({medication.sku || 'No SKU'})
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {medication && (
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                    Unit Price: <span className="font-mono font-medium">KES {effectiveUnitCost.toLocaleString()}</span>
                                </span>
                            </div>
                            {canCharge ? (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Billable
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                    {defaultUnitCost === 0 ? 'No Price Set' : 'Non-billable'}
                                </Badge>
                            )}
                        </div>
                    )}

                    {defaultUnitCost === 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="manualPrice" className="text-amber-600 flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                Set Unit Price (inventory has no price)
                            </Label>
                            <Input
                                id="manualPrice"
                                type="number"
                                placeholder="Enter price..."
                                value={manualPrice}
                                onChange={(e) => setManualPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="h-10 font-mono"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="doseValue">Clinical Dose</Label>
                            <Input
                                id="doseValue"
                                type="number"
                                value={doseValue}
                                onChange={(e) => setDoseValue(parseFloat(e.target.value) || 0)}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="doseUnit">Unit</Label>
                            <Input
                                id="doseUnit"
                                value={doseUnit}
                                onChange={(e) => setDoseUnit(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>

                    {canCharge && (
                        <>
                            <Separator className="my-2" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="billingQuantity" className="flex items-center gap-1.5">
                                        <Calculator className="h-3.5 w-3.5 text-slate-400" />
                                        Billing Quantity
                                    </Label>
                                    <Input
                                        id="billingQuantity"
                                        type="number"
                                        min={1}
                                        value={billingQuantity}
                                        onChange={(e) => setBillingQuantity(parseInt(e.target.value) || 1)}
                                        className="h-10 font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Total Charge</Label>
                                    <div className="h-10 flex items-center px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
                                        <span className="font-mono font-semibold text-emerald-700">
                                            KES {calculatedTotal.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <Separator className="my-2" />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="route">Route</Label>
                            <select
                                id="route"
                                className="w-full h-10 px-3 py-2 text-sm border rounded-md border-slate-200 bg-white ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                                value={route}
                                onChange={(e) => setRoute(e.target.value)}
                            >
                                <option value="IV">Intravenous (IV)</option>
                                <option value="IM">Intramuscular (IM)</option>
                                <option value="PO">Oral (PO)</option>
                                <option value="SC">Subcutaneous (SC)</option>
                                <option value="TOP">Topical</option>
                                <option value="INH">Inhalation</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeGiven" className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                Time Given
                            </Label>
                            <Input
                                id="timeGiven"
                                type="time"
                                value={timeGiven}
                                onChange={(e) => setTimeGiven(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Optional administration notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="secondary"
                        onClick={() => adminMutation.mutate(false)}
                        disabled={adminMutation.isPending}
                        className="gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Plan for Later
                    </Button>
                    <Button
                        onClick={() => adminMutation.mutate(true)}
                        disabled={adminMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                        {adminMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirm Given
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
