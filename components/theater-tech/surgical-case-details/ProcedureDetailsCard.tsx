'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';
import { getSurgicalCaseStatusDisplay } from '@/lib/surgical-case-status-display';

interface ProcedureDetailsCardProps {
  data: FrontdeskSurgicalCaseListItem;
}

export function ProcedureDetailsCard({ data }: ProcedureDetailsCardProps) {
  const statusCfg = getSurgicalCaseStatusDisplay(data.status);

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
