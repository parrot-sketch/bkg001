'use client';

import { Printer, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FinalizedChecklistDocument } from '@/components/nurse/ward-prep-checklist/components/FinalizedChecklistDocument';
import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { format } from 'date-fns';

export function PreopWardChecklistViewer(props: {
  caseId: string;
  patient: {
    first_name: string;
    last_name: string;
    file_number: string;
    date_of_birth?: string | Date | null;
    gender?: string | null;
  };
  surgeonName?: string | null;
  anaesthesiologistName?: string | null;
  signedAt?: Date | string | null;
  data: NursePreopWardChecklistDraft;
}) {
  const { caseId, patient, surgeonName, anaesthesiologistName, signedAt, data } = props;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="font-medium">Finalized pre-op ward checklist</span>
          {signedAt ? (
            <span className="text-slate-500">
              • Signed {format(new Date(signedAt), 'MMM d, yyyy HH:mm')}
            </span>
          ) : null}
        </div>

        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={`/doctor/surgical-cases/${caseId}/preop-ward-checklist/print`} target="_blank" rel="noopener noreferrer">
            <Printer className="h-4 w-4" />
            Print
          </a>
        </Button>
      </div>

      <FinalizedChecklistDocument
        caseId={caseId}
        patient={patient}
        surgeonName={surgeonName}
        anaesthesiologistName={anaesthesiologistName}
        data={data}
      />
    </div>
  );
}
