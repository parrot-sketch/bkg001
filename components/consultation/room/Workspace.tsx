'use client';

import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';
import type { StructuredNotes } from '@/shared-kernel/types/notes';

type SoapField = keyof StructuredNotes;

const NOTE_SECTIONS: { field: SoapField; label: string; placeholder: string }[] = [
  {
    field: 'chiefComplaint',
    label: 'Medical History',
    placeholder: 'Patient complaints, symptoms, history of present illness...',
  },
  {
    field: 'examination',
    label: 'Physical Examination',
    placeholder: 'Physical examination findings, vitals, test results...',
  },
  {
    field: 'assessment',
    label: 'Diagnosis',
    placeholder: 'Clinical assessment, diagnosis, differential diagnosis...',
  },
  {
    field: 'plan',
    label: 'Plan',
    placeholder: 'Treatment plan, medications, referrals, follow-up...',
  },
];

export interface NextQueuePatient {
  appointmentId: number;
  name: string;
  fileNumber: string;
}

interface WorkspaceProps {
  appointmentId: number | null;
  notes: StructuredNotes;
  onUpdateNotes: (field: SoapField, value: string) => void;
  isReadOnly: boolean;
  isSaving: boolean;
  isCompleting?: boolean;
  isDirty: boolean;
  onSaveDraft: () => void;
  onComplete: () => void;
  onReturnToHub?: () => void;
  onLeave?: () => void;
  nextPatient?: NextQueuePatient | null;
  queueReady?: boolean;
  onAdmitNext?: () => void;
  admitting?: boolean;
}

export function Workspace({
  appointmentId,
  notes,
  onUpdateNotes,
  isReadOnly,
  isSaving,
  isCompleting = false,
  isDirty,
  onSaveDraft,
  onComplete,
  onReturnToHub,
  onLeave,
  nextPatient,
  queueReady = true,
  onAdmitNext,
  admitting = false,
}: WorkspaceProps) {
  if (isReadOnly) {
    const firstName = nextPatient?.name.split(' ')[0];
    if (!queueReady) {
      return (
        <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-8">
          <div className="w-full max-w-lg border border-[#e7d6bf] bg-white">
            <div className="border-b border-[#2c2e4b] bg-[#2c2e4b] px-5 py-4 text-white">
              <h2 className="text-lg font-semibold">Consultation complete</h2>
            </div>
            <div className="bg-[#e7d6bf]/30 px-5 py-6">
              <p className="text-base font-semibold text-[#2c2e4b]">Checking the live queue…</p>
            </div>
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={onReturnToHub}
                className="h-12 w-full border border-[#2c2e4b]/20 px-4 text-base font-medium text-[#2c2e4b]"
              >
                Open charge sheet
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-8">
        <div className="w-full max-w-lg border border-[#e7d6bf] bg-white">
          <div className="border-b border-[#2c2e4b] bg-[#2c2e4b] px-5 py-4 text-white">
            <h2 className="text-lg font-semibold">Consultation complete</h2>
          </div>
          <div className="bg-[#e7d6bf]/30 px-5 py-4">
            {nextPatient ? (
              <>
                <p className="text-sm text-[#2c2e4b]/70">Next in the live queue</p>
                <p className="mt-1 text-lg font-semibold text-[#2c2e4b]">{nextPatient.name}</p>
                {nextPatient.fileNumber ? (
                  <p className="font-mono text-sm text-[#2c2e4b]/70">{nextPatient.fileNumber}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-[#2c2e4b]">The queue is clear</p>
                <p className="mt-1 text-sm text-[#2c2e4b]/70">No one is waiting to be seen.</p>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2 px-5 py-4">
            {nextPatient && onAdmitNext ? (
              <button
                type="button"
                onClick={onAdmitNext}
                disabled={admitting}
                className="h-12 bg-[#ee9b00] px-4 text-base font-semibold text-[#2c2e4b] disabled:opacity-50"
              >
                {admitting ? 'Admitting…' : `Admit ${firstName || 'next patient'}`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReturnToHub}
              className="h-12 border border-[#2c2e4b]/20 px-4 text-base font-medium text-[#2c2e4b]"
            >
              Open charge sheet
            </button>
            {!nextPatient && onLeave ? (
              <button
                type="button"
                onClick={onLeave}
                className="h-12 px-4 text-base font-medium text-[#2c2e4b]/70"
              >
                Back to dashboard
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e7d6bf] bg-white px-4 py-2 sm:px-6">
        <p className="text-sm text-[#2c2e4b]/60">{isDirty ? 'Unsaved changes' : 'Saved'}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving || !isDirty}
            className="h-10 border border-[#2c2e4b]/20 px-3 text-sm font-medium text-[#2c2e4b] disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={isSaving || isCompleting}
            className="h-10 bg-[#caa26a] px-4 text-sm font-semibold text-[#2c2e4b] disabled:opacity-40"
          >
            {isCompleting ? 'Completing…' : 'Complete'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {NOTE_SECTIONS.map((section) => (
          <section key={section.field} className="border-b border-[#e7d6bf]">
            <div className="border-b border-[#2c2e4b] bg-[#e7d6bf]/30 px-4 py-3 sm:px-6">
              <h2 className="text-sm font-semibold">{section.label}</h2>
            </div>
            <div className="px-2 py-3 sm:px-4">
              <ClinicalRichTextEditor
                content={notes[section.field] || ''}
                onChange={(value) => onUpdateNotes(section.field, value)}
                dictationContextType="appointment"
                dictationContextId={appointmentId}
                placeholder={section.placeholder}
                readOnly={isReadOnly}
                minHeight="9rem"
                ariaLabel={`${section.label} notes`}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
