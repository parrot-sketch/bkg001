'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck } from 'lucide-react';

interface SafetyChecklistSectionProps {
    checklist: {
        swabCountCorrect: boolean;
        instrumentCountCorrect: boolean;
        specimenLabeled: boolean;
        equipmentReturned: boolean;
        complicationsDocumented: boolean;
    };
    updateField: (path: string, value: any) => void;
    readOnly: boolean;
}

export function SafetyChecklistSection({ 
    checklist, 
    updateField, 
    readOnly 
}: SafetyChecklistSectionProps) {
    const items = [
        { key: 'swabCountCorrect', label: 'Swab & Instrument Count Correct' },
        { key: 'instrumentCountCorrect', label: 'Instrument Count Verified' },
        { key: 'specimenLabeled', label: 'Specimen(s) Properly Labeled' },
        { key: 'equipmentReturned', label: 'Equipment Returned to Storage' },
        { key: 'complicationsDocumented', label: 'Any Complications Documented' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-700">Safety Checklist</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                    <div 
                        key={item.key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-white"
                    >
                        <Checkbox 
                            checked={checklist[item.key as keyof typeof checklist]}
                            onCheckedChange={(v) => updateField(`safetyChecklist.${item.key}`, v)}
                            disabled={readOnly}
                            id={item.key}
                        />
                        <Label 
                            htmlFor={item.key}
                            className="text-sm text-stone-700 cursor-pointer"
                        >
                            {item.label}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    );
}
