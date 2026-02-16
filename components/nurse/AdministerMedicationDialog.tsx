'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { nurseFormsApi, MedicationSearchItem } from '@/lib/api/nurse-forms';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pill, CheckCircle2, Save, Clock } from 'lucide-react';
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
    const [doseValue, setDoseValue] = useState<number>(0);
    const [doseUnit, setDoseUnit] = useState('');
    const [route, setRoute] = useState('IV');
    const [timeGiven, setTimeGiven] = useState(new Date().toTimeString().slice(0, 5));
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (medication) {
            setDoseUnit(medication.unit_of_measure);
            setDoseValue(1);
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="doseValue">Dose Value</Label>
                            <Input
                                id="doseValue"
                                type="number"
                                value={doseValue}
                                onChange={(e) => setDoseValue(parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="doseUnit">Unit</Label>
                            <Input
                                id="doseUnit"
                                value={doseUnit}
                                onChange={(e) => setDoseUnit(e.target.value)}
                            />
                        </div>
                    </div>

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
