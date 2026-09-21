'use client';

import { PreopWardChecklistViewer } from '@/components/doctor/preop-ward-checklist/PreopWardChecklistViewer';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

/**
 * Read-only nurse pre-op checklist — document view only.
 */
export function PreopWardChecklistSection() {
  const { caseId, patient, surgicalCase, preopWardChecklist, anaesthesiologistName } =
    useDoctorSurgicalCaseWorkspace();

  const sc = surgicalCase as {
    primary_surgeon?: { name?: string | null } | null;
  } | null;

  const p = patient as {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
    date_of_birth?: Date | string | null;
    gender?: string | null;
  };

  if (!preopWardChecklist) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e7d6bf] bg-white/80 px-6 py-14 text-center">
        <ImageBadge />
        <p className="mt-3 text-sm font-medium text-[#2c2e4b]">Awaiting nursing finalization</p>
        <p className="mt-1 text-xs text-slate-500">
          The pre-operative ward checklist will appear here once nursing completes it.
        </p>
      </div>
    );
  }

  return (
    <PreopWardChecklistViewer
      caseId={caseId}
      patient={p}
      surgeonName={sc?.primary_surgeon?.name ?? null}
      anaesthesiologistName={anaesthesiologistName ?? null}
      signedAt={preopWardChecklist.signedAt}
      data={preopWardChecklist.data}
    />
  );
}

function ImageBadge() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e7d6bf]/50 text-[#caa26a]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
