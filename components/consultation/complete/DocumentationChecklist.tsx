'use client';

import { FileText, Stethoscope, ClipboardCheck, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-black">
        Documentation Review
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <ChecklistItem icon={FileText} label="Patient Concerns" complete={hasChief} />
        <ChecklistItem icon={Stethoscope} label="Examination" complete={hasExam} />
        <ChecklistItem icon={CalendarPlus} label="Treatment Plan" complete={hasPlan} />
      </div>
    </div>
  );
}

function ChecklistItem({
  icon: Icon,
  label,
  complete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  complete: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors',
      complete
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-slate-50 text-slate-400',
    )}>
      {complete ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      <span className={cn('font-medium', complete ? '' : 'font-normal')}>
        {label}
      </span>
    </div>
  );
}
