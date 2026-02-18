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

      {/* Read Mode or Editor */}
      {isReadOnly ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recorded Physical Findings</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </div>
          <div className="p-8">
            {examination ? (
              <div
                className="prose prose-slate prose-sm max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-base"
                dangerouslySetInnerHTML={{ __html: examination }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 text-slate-300">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-400">No physical examination findings recorded</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <RichTextEditor
          content={examination}
          onChange={handleChange}
          placeholder="Examination findings, measurements, body areas examined, tissue quality, skin laxity…"
          readOnly={isReadOnly}
          minHeight="420px"
        />
      )}
    </div>
  );
}
