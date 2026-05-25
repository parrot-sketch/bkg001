'use client';

interface DocumentationChecklistProps {
  hasChief: boolean;
  hasExam: boolean;
  hasPlan: boolean;
}

export function DocumentationChecklist({
  hasChief,
  hasExam,
  hasPlan,
}: DocumentationChecklistProps) {
  return (
    <div className="border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Documentation
        </h3>
      </div>
      <div className="px-4 py-3 space-y-2">
        <ChecklistRow label="Patient concerns" complete={hasChief} />
        <ChecklistRow label="Examination" complete={hasExam} />
        <ChecklistRow label="Treatment plan" complete={hasPlan} />
      </div>
    </div>
  );
}

function ChecklistRow({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-700">{label}</span>
      <span className={complete ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
        {complete ? 'Complete' : 'Missing'}
      </span>
    </div>
  );
}
