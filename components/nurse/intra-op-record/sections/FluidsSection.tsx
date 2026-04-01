'use client';

import { Label } from '@/components/ui/label';
import { NumberField } from '../fields';

interface FluidsSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function FluidsSection({ data, onChange, disabled }: FluidsSectionProps) {
    const d = data.fluids ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, fluids: { ...d, [field]: value } });

    const ebl = typeof d.estimatedBloodLossMl === 'number' ? d.estimatedBloodLossMl : 0;
    const urine = typeof d.urinaryOutputMl === 'number' ? d.urinaryOutputMl : 0;
    const catheterInserted = !!(data.catheter?.inSitu || data.catheter?.insertedInTheatre || data.catheter?.catheterInserted);

    const eblCritical = ebl > 1500;
    const eblWarning = !eblCritical && ebl > 500;
    const urineLow = catheterInserted && urine < 30 && urine >= 0;

    return (
        <div className="space-y-6">
            {eblCritical && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-lg">
                    <span className="text-red-600 font-bold text-sm shrink-0">Critical</span>
                    <p className="text-sm text-red-700">
                        <strong>Blood loss ≥ 1500 mL</strong> — Verify transfusion records and notify surgeon. Check haemostasis status.
                    </p>
                </div>
            )}
            {eblWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                    <span className="text-amber-600 font-bold text-sm shrink-0">Warning</span>
                    <p className="text-sm text-amber-800">
                        <strong>Blood loss &gt; 500 mL</strong> — Ensure transfusion record is up to date.
                    </p>
                </div>
            )}
            {urineLow && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                    <span className="text-amber-600 font-bold text-sm shrink-0">Warning</span>
                    <p className="text-sm text-amber-800">
                        <strong>Urine output &lt; 30 mL</strong> — Consider oliguria protocol. Notify anaesthetist.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Intravenous Infusion / Transfusions</h4>
                    <div className="space-y-4">
                        <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 space-y-3">
                            <Label className="text-[10px] font-bold text-red-600 uppercase">Blood Transfusion (mL)</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <NumberField label="Packed Cells" value={d.bloodTransfusionPackedCellsMl} onChange={(v) => set('bloodTransfusionPackedCellsMl', v || 0)} disabled={disabled} />
                                <NumberField label="Whole" value={d.bloodTransfusionWholeMl} onChange={(v) => set('bloodTransfusionWholeMl', v || 0)} disabled={disabled} />
                                <NumberField label="Others" value={d.bloodTransfusionOtherMl} onChange={(v) => set('bloodTransfusionOtherMl', v || 0)} disabled={disabled} />
                            </div>
                        </div>
                        <NumberField label="Intravenous Infusion" value={d.ivInfusionTotalMl} onChange={(v) => set('ivInfusionTotalMl', v || 0)} unit="mL" disabled={disabled} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Clinical Measurements</h4>
                    <div className="space-y-4">
                        <NumberField label="Estimated Blood Loss" value={d.estimatedBloodLossMl} onChange={(v) => set('estimatedBloodLossMl', v || 0)} unit="mL" disabled={disabled} />
                        <NumberField label="Urinary Output" value={d.urinaryOutputMl} onChange={(v) => set('urinaryOutputMl', v || 0)} unit="mL" disabled={disabled} />
                    </div>
                </div>
            </div>
        </div>
    );
}
