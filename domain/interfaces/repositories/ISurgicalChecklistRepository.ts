import { SurgicalChecklist } from '@prisma/client';

/**
 * Repository Interface: ISurgicalChecklistRepository
 *
 * Defines the contract for surgical safety checklist persistence.
 * The checklist enforces WHO Surgical Safety Checklist phases:
 * Sign-In (before anesthesia), Time-Out (before incision), Sign-Out (before leaving OR).
 *
 * Each checklist is 1:1 with a SurgicalCase.
 */
export interface ISurgicalChecklistRepository {
  /**
   * Find checklist by its surgical case ID.
   * Returns null if no checklist has been created yet.
   */
  findByCaseId(surgicalCaseId: string): Promise<SurgicalChecklist | null>;

  /**
   * Find checklist by its own ID.
   */
  findById(id: string): Promise<SurgicalChecklist | null>;

  /**
   * Create or ensure a checklist exists for a case (idempotent upsert).
   * If one already exists, returns it unchanged.
   */
  ensureExists(surgicalCaseId: string): Promise<SurgicalChecklist>;

  /**
   * Complete a checklist phase.
   * Writes completedAt + userId + role + items for the given phase.
   * This must be idempotent: if already completed, returns existing data without mutation.
   */
  completePhase(
    surgicalCaseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    data: {
      userId: string;
      userRole: string;
      items: ChecklistItemConfirmation[];
    }
  ): Promise<SurgicalChecklist>;

  /**
   * Save draft items for a phase WITHOUT setting completedAt.
   * Allows partial confirmations to be persisted.
   * Throws if phase is already completed (immutable after finalization).
   */
  saveDraftItems(
    surgicalCaseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItemConfirmation[]
  ): Promise<SurgicalChecklist>;

  /**
   * Check whether a specific phase is completed.
   * This avoids loading the full checklist just to check a gate.
   */
  isPhaseCompleted(surgicalCaseId: string, phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT'): Promise<boolean>;
}

/**
 * Individual checklist item confirmation.
 * Stored as JSON array in the phase items column.
 */
export interface ChecklistItemConfirmation {
  /** Unique key for the checklist item, e.g. "patient_identity_confirmed" */
  key: string;
  /** Human-readable label */
  label: string;
  /** Whether the item was confirmed */
  confirmed: boolean;
  /** Optional note (e.g. "Patient allergic to latex — noted") */
  note?: string;
}
