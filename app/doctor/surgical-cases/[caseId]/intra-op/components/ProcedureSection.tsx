'use client';

import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { Scissors } from 'lucide-react';

interface ProcedureSectionProps {
    procedure: {
        planned: string;
        performed: string;
    };
    procedureNotes: string;
    additionalNotes: string;
    updateField: (path: string, value: any) => void;
    readOnly: boolean;
}

export function ProcedureSection({ 
    procedure, 
    procedureNotes,
    additionalNotes,
    updateField, 
    readOnly 
}: ProcedureSectionProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-700">Procedure</h3>
            </div>
            
            <table className="w-full">
                <tbody>
                    <tr>
                        <td className="py-2 pr-4 w-48">
                            <Label className="text-sm text-stone-600">Planned</Label>
                        </td>
                        <td className="py-2">
                            <RichTextEditor
                                content={procedure.planned}
                                onChange={(val) => updateField('procedure.planned', val)}
                                placeholder="Planned procedure"
                                readOnly={readOnly}
                                minHeight="120px"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4">
                            <Label className="text-sm text-stone-600">Performed</Label>
                        </td>
                        <td className="py-2">
                            <RichTextEditor
                                content={procedure.performed}
                                onChange={(val) => updateField('procedure.performed', val)}
                                placeholder="Actual procedures performed"
                                readOnly={readOnly}
                                minHeight="150px"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            <div>
                <Label className="text-sm font-semibold mb-2 block">Procedure Notes</Label>
                <RichTextEditor
                    content={procedureNotes}
                    onChange={(val) => updateField('procedureNotes', val)}
                    placeholder="Detailed operative notes, findings, technique used..."
                    readOnly={readOnly}
                    minHeight="200px"
                />
            </div>

            <div>
                <Label className="text-sm font-semibold mb-2 block">Additional Notes</Label>
                <RichTextEditor
                    content={additionalNotes}
                    onChange={(val) => updateField('additionalNotes', val)}
                    placeholder="Continuation of operative notes..."
                    readOnly={readOnly}
                    minHeight="150px"
                />
            </div>
        </div>
    );
}
