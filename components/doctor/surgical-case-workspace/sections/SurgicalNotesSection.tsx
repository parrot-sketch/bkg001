'use client';

import { useRouter } from 'next/navigation';

import { SurgicalNotesEditor } from '@/components/doctor/surgical-notes/SurgicalNotesEditor';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';

export function SurgicalNotesSection() {
  const router = useRouter();
  const { caseId } = useDoctorSurgicalCaseWorkspace();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-medium text-slate-900">Surgical Notes</p>
        <p className="mt-1 text-sm text-slate-500">
          Use this space for the doctor&apos;s narrative notes. Structured records remain in their dedicated clinical forms.
        </p>
      </div>
      <SurgicalNotesEditor
        caseId={caseId}
        onContinue={() => router.push(`/doctor/surgical-cases/${caseId}/charge-sheet`)}
      />
    </div>
  );
}

