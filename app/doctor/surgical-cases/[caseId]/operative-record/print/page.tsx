import db from '@/lib/db';
import { notFound } from 'next/navigation';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  OPERATIVE_NOTE_TEMPLATE_KEY,
  OPERATIVE_NOTE_TEMPLATE_VERSION,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import { OperativeRecordPrintDocument } from '@/components/doctor/operative-record/print/OperativeRecordPrintDocument';

interface Props {
  params: Promise<{ caseId: string }>;
}

export default async function OperativeRecordPrintPage({ params }: Props) {
  const { caseId } = await params;

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      primary_surgeon: { select: { id: true, name: true } },
      staff_invites: {
        where: { status: 'ACCEPTED' },
        include: {
          invited_user: { select: { first_name: true, last_name: true } },
        },
      },
    },
  });

  if (!surgicalCase) notFound();

  const operative = await db.clinicalFormResponse.findUnique({
    where: {
      template_key_template_version_surgical_case_id: {
        template_key: OPERATIVE_NOTE_TEMPLATE_KEY,
        template_version: OPERATIVE_NOTE_TEMPLATE_VERSION,
        surgical_case_id: caseId,
      },
    },
    select: { data_json: true, status: true, signed_at: true },
  });

  if (!operative) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-8 text-center text-slate-500">
        <div>
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-700">No Operative Record Found</h2>
          <p className="mt-2">Operative record for this case has not been started yet.</p>
        </div>
      </div>
    );
  }

  let data: any = {};
  try {
    data = JSON.parse(operative.data_json);
  } catch {
    data = {};
  }

  return (
    <OperativeRecordPrintDocument
      operativeStatus={operative.status}
      operativeSignedAt={operative.signed_at}
      data={data}
      surgicalCase={surgicalCase}
    />
  );
}
