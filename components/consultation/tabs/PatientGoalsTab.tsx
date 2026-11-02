'use client';

/**
 * Patient Goals Tab — streamlined
 * 
 * Single responsibility: free-form clinical documentation via RichTextEditor.
 */

import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';

interface PatientGoalsTabProps {
    appointmentId?: number | null;
    initialValue?: string;
    onChange: (value: string) => void;
    isReadOnly?: boolean;
}

export function PatientGoalsTab({
    appointmentId,
    initialValue = '',
    onChange,
    isReadOnly = false,
}: PatientGoalsTabProps) {
    return (
        <div className="space-y-4">
            <ClinicalRichTextEditor
                content={initialValue}
                onChange={onChange}
                dictationContextType="appointment"
                dictationContextId={appointmentId}
                placeholder="Document patient concerns and goals..."
                readOnly={isReadOnly}
                minHeight="400px"
            />
        </div>
    );
}
