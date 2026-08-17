'use client';

import { format } from 'date-fns';
import { FileText, User, Scissors, Calendar, Shield, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Procedure } from './types';

interface CaseSummaryProps {
  caseId: string;
  currentStep: number;
  confirmedProcedures: Procedure[];
}

export function CaseSummary({ caseId, currentStep, confirmedProcedures }: CaseSummaryProps) {
  return (
    <div className="sticky top-24 space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Case Summary
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <SummaryRow
            icon={<FileText className="h-3.5 w-3.5 text-slate-400" />}
            label="Case ID"
            value={`#${caseId.slice(0, 8).toUpperCase()}`}
          />
          <SummaryRow
            icon={<Shield className="h-3.5 w-3.5 text-slate-400" />}
            label="Status"
            value="Draft"
            valueClassName="text-amber-700"
          />
          <SummaryRow
            icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />}
            label="Procedure Date"
            value="Not set"
          />
          <SummaryRow
            icon={<User className="h-3.5 w-3.5 text-slate-400" />}
            label="Primary Surgeon"
            value="Not selected"
          />
          <SummaryRow
            icon={<Scissors className="h-3.5 w-3.5 text-slate-400" />}
            label="Procedures"
            value={
              confirmedProcedures.length > 0
                ? `${confirmedProcedures.length} selected`
                : 'None'
            }
          />
          <SummaryRow
            icon={<Activity className="h-3.5 w-3.5 text-slate-400" />}
            label="Current Step"
            value={`Step ${currentStep} of 3`}
          />
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
        <p className="text-xs text-blue-700 leading-relaxed">
          Complete each section to build the surgical case plan. Changes are saved
          as you progress through each step.
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={cn('text-xs font-medium text-right', valueClassName || 'text-slate-700')}>
        {value}
      </span>
    </div>
  );
}
