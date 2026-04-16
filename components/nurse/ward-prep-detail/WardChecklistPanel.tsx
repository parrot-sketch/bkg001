'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ClipboardList, Eye, FileText } from 'lucide-react';

import type { WardChecklistStatus } from '@/lib/api/nurse';

export function WardChecklistPanel(props: { caseId: string; wardChecklist: WardChecklistStatus }) {
  const { caseId, wardChecklist } = props;

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Ward Checklist</h3>
          <p className="text-xs text-slate-500">This is the only readiness signal for ward prep</p>
        </div>
        {wardChecklist.isComplete ? (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</Badge>
        ) : wardChecklist.isStarted ? (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200">In Progress</Badge>
        ) : (
          <Badge variant="outline" className="text-slate-600">
            Not Started
          </Badge>
        )}
      </div>

      <CardContent className="p-6">
        {wardChecklist.isComplete ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">Checklist finalized</p>
                <p className="text-xs text-slate-600 mt-1">
                  Signed by <span className="font-medium">{wardChecklist.signedBy || 'Nurse'}</span>
                  {wardChecklist.signedAt ? (
                    <>
                      <span className="text-slate-300"> · </span>
                      <span className="font-medium">{format(new Date(wardChecklist.signedAt), 'MMM d, yyyy h:mm a')}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500 mt-2">The case is ready for theater scheduling.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" asChild className="justify-center">
                <Link href={`/nurse/ward-prep/${caseId}/checklist`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Checklist
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-center">
                <Link href={`/nurse/ward-prep/${caseId}/checklist/print`} target="_blank">
                  <FileText className="h-4 w-4 mr-2" />
                  Print
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">
                {wardChecklist.isStarted ? 'Continue the ward checklist' : 'Start the ward checklist'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Once finalized, the case automatically moves to theater scheduling.
              </p>
            </div>
            <Button variant="outline" asChild className="justify-center">
              <Link href={`/nurse/ward-prep/${caseId}/checklist`}>
                <ClipboardList className="h-4 w-4 mr-2" />
                {wardChecklist.isStarted ? 'Continue Checklist' : 'Start Checklist'}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

