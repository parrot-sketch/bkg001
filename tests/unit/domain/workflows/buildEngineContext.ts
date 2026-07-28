import type { GuardContext } from '@/domain/workflows/GuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import type { GuardRegistry } from '@/domain/workflows/GuardRegistry';

export function buildEngineContext(overrides: Partial<GuardContext> = {}): GuardContext {
  const base: GuardContext = {
    appointmentId: 1,
    patientId: 'patient-1',
    consultationId: 1,
    doctorId: 'doctor-1',
    appointment: {
      id: 1,
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'IN_CONSULTATION',
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
    notes: { chiefComplaint: 'Headache' },
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
    consultationWorkflowState: ConsultationWorkflowState.IDLE,
    documentationWorkflowState: DocumentationWorkflowState.Document,
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

export function createWorkflowEngine(context?: Partial<GuardContext>): WorkflowEngine {
  const emptyRegistry: GuardRegistry = {
    getGuards: () => [],
  };
  const ctx = buildEngineContext(context);
  return new WorkflowEngine(
    ctx.consultationWorkflowState,
    ctx.documentationWorkflowState,
    ctx,
    { registry: emptyRegistry, shortCircuit: false }
  );
}
