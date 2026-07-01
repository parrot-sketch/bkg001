'use client';

/**
 * Patient Goals Tab — streamlined
 * 
 * Single responsibility: free-form clinical documentation via RichTextEditor.
 */

import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface PatientGoalsTabProps {
    initialValue?: string;
    onChange: (value: string) => void;
    isReadOnly?: boolean;
}

export function PatientGoalsTab({
    initialValue = '',
    onChange,
    isReadOnly = false,
}: PatientGoalsTabProps) {
    return (
        <div className="space-y-4">
            <RichTextEditor
                content={initialValue}
                onChange={onChange}
                placeholder="Document patient concerns and goals..."
                readOnly={isReadOnly}
                minHeight="400px"
            />
        </div>
    );
}
