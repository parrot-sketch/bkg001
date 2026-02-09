'use client';

/**
 * Examination Tab
 * 
 * Single responsibility: examination notes (`examination` field in StructuredNotes).
 * Physical examination findings, measurements, and observations.
 * 
 * Note: Auto-saves via parent context — no per-tab save button needed.
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface ExaminationTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

export function ExaminationTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: ExaminationTabProps) {
  const [examination, setExamination] = useState(initialValue);

  useEffect(() => {
    setExamination(initialValue);
  }, [initialValue]);

  const handleChange = (value: string) => {
    setExamination(value);
    onChange(value);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <Label htmlFor="examination" className="text-sm font-semibold">
          Physical Examination
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Document examination findings, measurements, and observations.
        </p>
        <RichTextEditor
          content={examination}
          onChange={handleChange}
          placeholder="Examination findings, measurements, body areas examined..."
          readOnly={isReadOnly}
          minHeight="500px"
        />
      </div>
    </div>
  );
}
