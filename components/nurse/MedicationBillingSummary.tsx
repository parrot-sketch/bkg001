'use client';

import { MedicationAdministration } from '@/lib/api/nurse-forms';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MedicationBillingSummaryProps {
    administrations: MedicationAdministration[];
    inventoryItems?: any[]; // For cost data if not in admin record
}

export function MedicationBillingSummary({ administrations }: MedicationBillingSummaryProps) {
    const activeAdmins = administrations.filter(a => a.status === 'ADMINISTERED');

    // In a real app, we'd fetch the exact bill items. 
    // Here we can estimate or just show the status.
    const billedCount = activeAdmins.length;

    // We don't have direct unit_cost in the administration record (it's in inventory_usage), 
    // but we can show that they are queued for billing.

    if (activeAdmins.length === 0) return null;

    return (
        <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-500" />
                        Billing Preview
                    </h4>
                    <Badge variant="outline" className="bg-white">
                        {billedCount} item{billedCount !== 1 ? 's' : ''} queued
                    </Badge>
                </div>

                <div className="space-y-2">
                    {activeAdmins.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between text-xs py-1 border-b border-white last:border-0 text-slate-600">
                            <span>{admin.name} ({admin.dose_value} {admin.dose_unit})</span>
                            <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Billable
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 italic">
                    <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Costs are automatically added to the patient's final bill.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
