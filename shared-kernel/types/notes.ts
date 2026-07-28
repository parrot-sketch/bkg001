/**
 * Shared Kernel — Consultation Notes Types
 *
 * Canonical shape for structured consultation notes.
 * Defined here so that pure serialization utilities can operate
 * without importing from the Domain Layer.
 */

export interface StructuredNotes {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}

export interface ConsultationNotesPayload {
  readonly rawText?: string;
  readonly structured?: StructuredNotes;
}
