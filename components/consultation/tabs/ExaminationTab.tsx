'use client';

/**
 * Examination Tab
 * 
 * Single responsibility: examination notes (`examination` field).
 * Physical examination findings, measurements, and observations.
 * 
 * Auto-saves via parent context — no per-tab save button needed.
 */

import { useState, useEffect } from 'react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { Stethoscope } from 'lucide-react';

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
    <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Physical Examination</h2>
        </div>
        <p className="text-xs text-slate-500 ml-6">
          Document examination findings, measurements, body areas examined, and clinical observations.
        </p>
      </div>

      {/* Editor */}
      <RichTextEditor
        content={examination}
        onChange={handleChange}
        placeholder="Examination findings, measurements, body areas examined, tissue quality, skin laxity…"
        readOnly={isReadOnly}
        minHeight="420px"
      />
    </div>
  );
}
