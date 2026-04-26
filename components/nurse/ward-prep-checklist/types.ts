import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import type { SignatureValue } from '@/components/nurse/ward-prep-checklist/components/SignaturePadDialog';

export interface WardChecklistSectionProps {
  data: NursePreopWardChecklistDraft;
  onChange: (data: NursePreopWardChecklistDraft) => void;
  disabled: boolean;
  caseId: string;
  patient: any;
  formResponseId: string;
  patientAllergies?: string | null;
  currentUser?: { firstName?: string; lastName?: string; email?: string } | null;
  onPersistSignature?: (args: { role: 'PREPARED_BY' | 'RECEIVED_BY' | 'HANDED_OVER_BY'; value: SignatureValue }) => Promise<void>;
}
