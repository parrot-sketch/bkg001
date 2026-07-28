/**
 * Shared Kernel — Workflow Type Primitives
 *
 * Base types used by both Consultation and Documentation state machines.
 * These are pure TypeScript types with zero framework dependencies.
 */

/**
 * Clinical risk level for guard failures.
 * Used to prioritize clinical safety violations.
 */
export type ClinicalRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Base state interface for all workflow states.
 */
export interface WorkflowStateBase {
  readonly isTerminal: boolean;
  readonly displayName: string;
}

/**
 * Base action interface for all workflow actions.
 */
export interface WorkflowActionBase {
  readonly name: string;
  readonly description: string;
}

/**
 * Base context interface for all workflow transitions.
 */
export interface WorkflowContextBase {
  readonly appointmentId: number | null;
  readonly patientId: string | null;
  readonly consultationId: number | null;
  readonly doctorId: string | null;
}
