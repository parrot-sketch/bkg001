/**
 * Shared Kernel — Barrel Exports
 *
 * Public entry point for the Shared Kernel.
 *
 * Consumers must import from this entry point only.
 * Internal paths are private and may change without notice.
 */

export {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from './errors/codes';

export type { ClinicalError } from './errors/types';
export { isClinicalError } from './errors/types';

export {
  consultationKeys,
  consultationsKeys,
  patientHistoryKeys,
  doctorQueueKeys,
  policyConsultation,
  policyConsultations,
  policyPatientHistory,
  policyDoctorQueue,
  policyDefault,
  invalidationTriggers,
  pollingPolicy,
  type CachePolicy,
} from './query-config';

export type {
  DraftStorage,
  DraftRecord,
  DraftDataResult,
  DraftEmptyResult,
  DraftFailure,
  DraftResult,
  DraftStorageCapabilities,
} from './interfaces/draft-storage';
export { draftEmpty, draftData, draftFailure } from './interfaces/draft-storage';

export {
  serializeDraft,
  deserializeDraft,
  createDraftRecord,
} from './utils/draft-serialization';
export { generateFullText, parseLegacyNotes } from './utils/note-serialization';
export { isVersionConflict } from './utils/version-conflict';

export type {
  StructuredNotes,
  ConsultationNotesPayload,
} from './types/notes';

// Uncomment as tasks populate Shared Kernel folders
// export * from './types/identities';
// export * from './types/temporal';
// export * from './constants/brand';
// export * from './events';
// export * from './utils';
// export * from './validation';
// export * from './testing';
