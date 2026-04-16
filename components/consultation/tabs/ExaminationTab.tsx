'use client';

/**
 * Flexible, documentation-first examination tab.
 *
 * Keeps the UI clean and neutral for aesthetic surgery consultations:
 * - no preset examination selections
 * - no assumed specialty-specific findings
 * - clear free-form documentation guidance
 */

import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { CheckCircle2, FileText, ScanLine, ShieldCheck, Stethoscope } from 'lucide-react';

interface ExaminationTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

const DOCUMENTATION_PROMPTS = [
  {
    title: 'Objective findings',
    description: 'Document what was observed on inspection, palpation, measurement, symmetry, skin quality, scars, masses, tenderness, or function.',
    icon: ScanLine,
  },
  {
    title: 'Procedure relevance',
    description: 'Capture findings that affect candidacy, planning, risk, or the expected outcome for the proposed aesthetic intervention.',
    icon: Stethoscope,
  },
  {
    title: 'Risk and safety',
    description: 'Note contraindications, healing concerns, red flags, or anything that should influence consent, timing, or follow-up.',
    icon: ShieldCheck,
  },
];

export function ExaminationTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: ExaminationTabProps) {
  const hasContent = initialValue.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Clinical Examination</h2>
            <p className="text-sm text-slate-500">
              Record the examination exactly as performed, using the clinician&apos;s own structure and terminology.
            </p>
          </div>
          {hasContent && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Findings Recorded
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Documentation Principle
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This section is intentionally free-form. The system does not impose preset examination options so the record can stay accurate across facial, breast, body, reconstructive, and follow-up consultations.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {DOCUMENTATION_PROMPTS.map((prompt) => (
          <div
            key={prompt.title}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <prompt.icon className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">{prompt.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{prompt.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <RichTextEditor
          content={initialValue}
          onChange={onChange}
          placeholder="Document examination findings, relevant measurements, observed asymmetries, tissue quality, scars, tenderness, function, and any other clinically important observations..."
          readOnly={isReadOnly}
          minHeight="420px"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Reliable Charting
        </h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-800">Keep it objective</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Prefer observed findings, measurements, and clinically relevant descriptors over templated or generic language.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-800">Make it actionable</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Include the details that inform recommendations, consent discussion, treatment planning, and photo correlation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
