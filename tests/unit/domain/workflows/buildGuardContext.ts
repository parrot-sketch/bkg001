/**
 * Test utilities for workflow guard tests.
 */

import type { GuardContext } from '@/domain/workflows/GuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';

export function buildGuardContext(overrides: Partial<GuardContext> = {}): GuardContext {
  const base: GuardContext = {
    appointmentId: 1,
    patientId: 'patient-1',
    consultationId: 1,
    doctorId: 'doctor-1',
    appointment: {
      id: 1,
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'CHECKED_IN',
      slotStartTime: '2024-01-01T10:00:00Z',
      slotDurationMinutes: 30,
    },
    consultation: {
      id: 1,
      appointmentId: 1,
      state: 'IN_PROGRESS',
      version: '1',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    notes: { structured: { chiefComplaint: 'Headache' } },
    outcomeType: 'CONSULTATION_ONLY',
    patientDecision: null,
    isDirty: false,
    lastSavedAt: Date.now(),
    version: '1',
    queue: {
      inConsultation: [],
      waiting: [],
    },
    user: {
      id: 'doctor-1',
      role: 'DOCTOR',
      name: 'Dr. Smith',
    },
    retryCount: 0,
    metadata: {},
    consultationWorkflowState: ConsultationWorkflowState.ACTIVE,
    documentationWorkflowState: DocumentationWorkflowState.Draft,
    hasLocalDraft: false,
    localDraftTimestamp: null,
  };

  const result: GuardContext = { ...base };
  const keys = Object.keys(overrides) as (keyof GuardContext)[];
  for (const key of keys) {
    if (key in overrides) {
      (result as any)[key] = (overrides as any)[key];
    }
  }
  return result;
}
