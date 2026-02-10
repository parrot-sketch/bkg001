'use client';

/**
 * Chief Complaint Tab
 * 
 * Single responsibility: chief complaint notes (`chiefComplaint` field).
 * Captures the patient's primary concern and aesthetic goals.
 * 
 * Auto-saves via parent context — no per-tab save button needed.
 */

import { useState, useEffect } from 'react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { FileText } from 'lucide-react';

interface PatientGoalsTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

const COMMON_CONCERNS = [
  'Facial rejuvenation',
  'Body contouring',
  'Breast enhancement',
  'Rhinoplasty',
  'Skin tightening',
  'Scar revision',
  'Liposuction',
  'Tummy tuck',
];

export function PatientGoalsTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: PatientGoalsTabProps) {
  const [goals, setGoals] = useState(initialValue);

  useEffect(() => {
    setGoals(initialValue);
  }, [initialValue]);

  const handleChange = (value: string) => {
    setGoals(value);
    onChange(value);
  };

  return (
    <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Chief Complaint</h2>
        </div>
        <p className="text-xs text-slate-500 ml-6">
          What brings the patient in today? Document their primary concern and aesthetic goals.
        </p>
      </div>

      {/* Editor */}
      <RichTextEditor
        content={goals}
        onChange={handleChange}
        placeholder="Document the patient's primary concern, aesthetic goals, and expectations…"
        readOnly={isReadOnly}
        minHeight="350px"
      />

      {/* Quick-add concern chips */}
      {!isReadOnly && (
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Quick Add — Common Concerns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_CONCERNS.map((concern) => (
              <button
                key={concern}
                type="button"
                onClick={() => {
                  const newGoals = goals
                    ? `${goals}\n<p>• ${concern}</p>`
                    : `<p>• ${concern}</p>`;
                  handleChange(newGoals);
                }}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
              >
                {concern}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
