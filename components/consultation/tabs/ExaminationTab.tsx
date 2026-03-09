'use client';

/**
 * Simple, Doctor-Driven Examination Tab
 * 
 * Focuses on a single rich text area for all findings,
 * with optional quick-add findings for common clinical observations.
 */

import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { Stethoscope, Sparkles, Heart, Eye, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExaminationTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

const QUICK_FINDINGS = [
  { label: 'Normal Face', icon: Eye, content: '<p>• Symmetrical facial features. No significant skin laxity or volume loss noted.</p>' },
  { label: 'Good Elasticity', icon: Sparkles, content: '<p>• Skin elasticity is good. Fitzpatrick type II. No significant sun damage.</p>' },
  { label: 'Normal Contour', icon: Heart, content: '<p>• Body contour is within normal limits. Even fat distribution. No significant scarring.</p>' },
  { label: 'General Normal', icon: Stethoscope, content: '<p>• Well-appearing, vital signs stable, and full range of motion.</p>' },
];

export function ExaminationTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: ExaminationTabProps) {
  const handleQuickAdd = (content: string) => {
    const newValue = initialValue ? `${initialValue}\n${content}` : content;
    onChange(newValue);
    toast.success('Finding added');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-500" />
            Physical Examination & Findings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Record physical findings, measurements, and clinical observations.
          </p>
        </div>
        {initialValue.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3" />
            Findings Recorded
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-wrap gap-2">
          {QUICK_FINDINGS.map((finding) => (
            <button
              key={finding.label}
              type="button"
              onClick={() => handleQuickAdd(finding.content)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
            >
              <finding.icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500" />
              {finding.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <RichTextEditor
          content={initialValue}
          onChange={onChange}
          placeholder="Start typing examination findings or use quick-add buttons above..."
          readOnly={isReadOnly}
          minHeight="400px"
        />
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Doctor&apos;s Tip</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Be concise and objective. Use consistent terminology for measurements. 
          Findings recorded here will be summarized in the final consultation report.
        </p>
      </div>
    </div>
  );
}
