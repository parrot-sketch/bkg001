'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  PLANNING: { label: 'Planning', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', className: 'border border-blue-300 bg-blue-100 text-blue-800' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED: { label: 'Scheduled', className: 'border border-indigo-300 bg-indigo-100 text-indigo-800' },
  IN_PREP: { label: 'In Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  IN_THEATER: { label: 'In Theater', className: 'border border-red-300 bg-red-100 text-red-800' },
  RECOVERY: { label: 'Recovery', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  COMPLETED: { label: 'Completed', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'border border-red-300 bg-red-100 text-red-800' },
};

interface ProcedureDetailsCardProps {
  data: FrontdeskSurgicalCaseListItem;
}

export function ProcedureDetailsCard({ data }: ProcedureDetailsCardProps) {
  const statusCfg = STATUS_CONFIG[data.status] || { label: data.status, className: 'border border-slate-300 bg-slate-100 text-slate-700' };

  return (
    <Card className="bg-white/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-[#2c2e4b]">Procedure Details</CardTitle>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Procedure</p>
          <p className="text-sm font-medium text-slate-900">{data.procedure_name || 'Unnamed procedure'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Category</p>
          <p className="text-sm font-medium text-slate-900">{data.procedure_category || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Date</p>
          <p className="text-sm font-medium text-slate-900">
            {data.procedure_date ? format(new Date(data.procedure_date), 'MMM d, yyyy') : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Admission Type</p>
          <p className="text-sm font-medium text-slate-900">{data.admission_type || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Primary / Revision</p>
          <p className="text-sm font-medium text-slate-900">{data.primary_or_revision || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Urgency</p>
          <p className="text-sm font-medium text-slate-900">{data.urgency || '—'}</p>
        </div>
        {data.diagnosis && (
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Diagnosis</p>
            <p className="text-sm font-medium text-slate-900">{data.diagnosis}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
