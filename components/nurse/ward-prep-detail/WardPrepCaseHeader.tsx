'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList, Clock, Eye, FileText } from 'lucide-react';

type WardChecklistUiState =
  | { kind: 'complete'; signedBy?: string | null }
  | { kind: 'started' }
  | { kind: 'not_started' };

export function WardPrepCaseHeader(props: {
  caseId: string;
  patientName: string;
  procedureName: string;
  statusLabel: string;
  statusTone: 'ward' | 'other';
  wardChecklistState: WardChecklistUiState;
}) {
  const { caseId, patientName, procedureName, statusLabel, statusTone, wardChecklistState } = props;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-3 w-fit text-slate-500 hover:text-slate-900">
          <Link href="/nurse/ward-prep">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ward List
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{patientName}</h1>
          <Badge variant={statusTone === 'ward' ? 'default' : 'secondary'}>{statusLabel}</Badge>
        </div>
        <p className="text-slate-500 text-sm">{procedureName}</p>
      </div>

      <div className="flex items-center gap-2">
        {wardChecklistState.kind === 'complete' ? (
          <>
            <Button
              variant="outline"
              asChild
              className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 shadow-sm"
            >
              <Link href={`/nurse/ward-prep/${caseId}/checklist`}>
                <Eye className="w-4 h-4 mr-2" />
                View Completed Checklist
              </Link>
            </Button>
            <Button variant="outline" asChild className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm">
              <Link href={`/nurse/ward-prep/${caseId}/checklist/print`} target="_blank">
                <FileText className="w-4 h-4 mr-2" />
                Print Checklist
              </Link>
            </Button>
          </>
        ) : wardChecklistState.kind === 'started' ? (
          <Button variant="outline" asChild className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 shadow-sm">
            <Link href={`/nurse/ward-prep/${caseId}/checklist`}>
              <Clock className="w-4 h-4 mr-2" />
              Continue Ward Checklist
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm">
            <Link href={`/nurse/ward-prep/${caseId}/checklist`}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Complete Ward Checklist
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

