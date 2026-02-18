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

      {/* Read Mode or Editor */}
      {isReadOnly ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recorded Assessment</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </div>
          <div className="p-8">
            {goals ? (
              <div
                className="prose prose-slate prose-sm max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-base"
                dangerouslySetInnerHTML={{ __html: goals }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 text-slate-300">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-400">No chief complaint recorded during this session</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <RichTextEditor
          content={goals}
          onChange={handleChange}
          placeholder="Document the patient's primary concern, aesthetic goals, and expectations…"
          readOnly={isReadOnly}
          minHeight="350px"
        />
      )}

      {/* Quick-add concern chips */}
      {!isReadOnly && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
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
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
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
