'use client';

import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { FileText } from 'lucide-react';

interface DiagnosisSectionProps {
    diagnosis: {
        preOperative: string;
        operative: string;
    };
    updateField: (path: string, value: any) => void;
    readOnly: boolean;
}

export function DiagnosisSection({ 
    diagnosis, 
    updateField, 
    readOnly 
}: DiagnosisSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-700">Diagnosis</h3>
            </div>
            
            <table className="w-full">
                <tbody>
                    <tr>
                        <td className="py-2 pr-4 w-48">
                            <Label className="text-sm text-stone-600">Pre-Operative</Label>
                        </td>
                        <td className="py-2">
                            <RichTextEditor
                                content={diagnosis.preOperative}
                                onChange={(val) => updateField('diagnosis.preOperative', val)}
                                placeholder="Pre-operative diagnosis"
                                readOnly={readOnly}
                                minHeight="120px"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4">
                            <Label className="text-sm text-stone-600">Operative</Label>
                        </td>
                        <td className="py-2">
                            <RichTextEditor
                                content={diagnosis.operative}
                                onChange={(val) => updateField('diagnosis.operative', val)}
                                placeholder="Intra-operative findings/diagnosis"
                                readOnly={readOnly}
                                minHeight="120px"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
