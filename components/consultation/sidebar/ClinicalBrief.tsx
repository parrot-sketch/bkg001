'use client';

import type { StructuredNotes } from '@/contexts/ConsultationContext';

interface ClinicalBriefProps {
  isReadOnly: boolean;
  notes?: StructuredNotes;
  primaryConcern: string;
  reviewNotes?: string | null;
}

export function ClinicalBrief({ isReadOnly, notes, primaryConcern, reviewNotes }: ClinicalBriefProps) {
  return (
    <>
      {isReadOnly && notes && (Object.keys(notes).length > 0) ? (
        <div className="space-y-2.5">
          {Object.entries(notes).map(([key, value]) => value && (
            <div key={key} className="bg-white/40 border border-slate-200/50 rounded-lg p-2.5 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <div
                className="text-[11px] text-slate-700 leading-relaxed line-clamp-3 prose-p:my-0"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          {primaryConcern}
        </div>
      )}
      {reviewNotes && (
        <div className="mt-3 text-[11px] text-amber-800 bg-amber-50/50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
          <span className="font-bold text-[10px] uppercase tracking-wider block mb-1 text-amber-600">Nurse Annotation</span>
          {reviewNotes}
        </div>
      )}
    </>
  );
}
