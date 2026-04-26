'use client';

import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';
import { PreopWardChecklistViewer } from '@/components/doctor/preop-ward-checklist/PreopWardChecklistViewer';

export function PreopWardChecklistSection() {
  const { caseId, patient, surgicalCase, preopWardChecklist, anaesthesiologistName } =
    useDoctorSurgicalCaseWorkspace();

  if (!preopWardChecklist) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-medium text-slate-900">Pre-op ward checklist not finalized yet</p>
        <p className="mt-1 text-sm text-slate-500">
          This document becomes available here once the nurse finalizes the pre-operative ward check-list.
        </p>
      </div>
    );
  }

  return (
    <PreopWardChecklistViewer
      caseId={caseId}
      patient={patient as { first_name: string; last_name: string; file_number: string; date_of_birth?: string | Date | null; gender?: string | null }}
      surgeonName={(surgicalCase as { primary_surgeon?: { name?: string | null } | null })?.primary_surgeon?.name ?? null}
      anaesthesiologistName={anaesthesiologistName ?? null}
      signedAt={preopWardChecklist.signedAt}
      data={preopWardChecklist.data}
    />
  );
}
