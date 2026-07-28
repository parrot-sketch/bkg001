/**
 * Shared Kernel — Guard Context
 *
 * Immutable context passed to all guard functions.
 * Combines all data needed for guard evaluation.
 */

import type { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import type { PatientDecision } from '@/domain/enums/PatientDecision';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import type { ConsultationWorkflowState } from './ConsultationWorkflowStateMachine';
import type { DocumentationWorkflowState } from './DocumentationWorkflowStateMachine';
import type { TransitionContextBase } from './TransitionContext';
import type { GuardResult } from './GuardResult';

export interface GuardContext extends TransitionContextBase {
  readonly appointment: {
    readonly id: number;
    readonly patientId: string;
    readonly doctorId: string;
    readonly status: string;
    readonly slotStartTime: string;
    readonly slotDurationMinutes: number;
  } | null;
  readonly consultation: {
    readonly id: number;
    readonly appointmentId: number;
    readonly state: string;
    readonly version: string;
    readonly updatedAt: string;
  } | null;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
  readonly isDirty: boolean;
  readonly lastSavedAt: number | null;
  readonly version: string | null;
  readonly queue: {
    readonly inConsultation: readonly { readonly id: number; readonly patientId: string }[];
    readonly waiting: readonly { readonly id: number; readonly patientId: string }[];
  } | null;
  readonly user: {
    readonly id: string;
    readonly role: string;
    readonly name: string;
    readonly doctorId?: string;
  };
  readonly retryCount: number;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly consultationWorkflowState: ConsultationWorkflowState;
  readonly documentationWorkflowState: DocumentationWorkflowState;
  readonly hasLocalDraft: boolean;
  readonly localDraftTimestamp: number | null;
}

export type GuardFunction = (ctx: GuardContext) => GuardResult;
