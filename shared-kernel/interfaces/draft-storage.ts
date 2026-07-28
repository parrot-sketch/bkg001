/**
 * Shared Kernel — Draft Storage Contract
 *
 * Framework-agnostic persistence boundary for consultation drafts.
 *
 * This interface defines business intent, not browser APIs.
 * Implementations may use localStorage, IndexedDB, encrypted storage,
 * or cloud persistence — consumers remain unaware of the mechanism.
 */

import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from '../errors/codes';
import type { ClinicalError } from '../errors/types';

/**
 * Payload stored for a single draft.
 *
 * *Compatibility guarantee:* The shape of this record MUST remain stable.
 * Existing saved drafts in `localStorage` use this exact JSON structure.
 */
export interface DraftRecord<T> {
  readonly structured: T;
  readonly timestamp: string; // ISO 8601
}

/**
 * Successful result with data.
 */
export interface DraftDataResult<T> {
  readonly success: true;
  readonly record: T;
}

/**
 * Successful result with no data.
 */
export interface DraftEmptyResult {
  readonly success: true;
}

/**
 * Failed result.
 */
export interface DraftFailure {
  readonly success: false;
  readonly error: ClinicalError;
}

/**
 * Union result for operations that may return data or fail.
 */
export type DraftResult<T> = DraftDataResult<T> | DraftEmptyResult | DraftFailure;

/**
 * Storage adapter capabilities.
 *
 * An adapter may support a subset of capabilities.
 */
export interface DraftStorageCapabilities {
  readonly supportsTTL: boolean;
  readonly supportsList: boolean;
}

/**
 * DraftStorage — persistence boundary for consultation drafts.
 *
 * Implementations:
 * - MUST NOT throw browser-specific exceptions.
 * - MUST return `DraftFailure` with a `ClinicalError` on recoverable failures.
 * - MAY return `DraftFailure` with `ClinicalErrorCode.STORAGE_UNAVAILABLE`
 *   when the underlying mechanism is inaccessible.
 */
export interface DraftStorage<T> {
  readonly capabilities: DraftStorageCapabilities;

  /**
   * Persist a draft under the given key.
   *
   * If a draft already exists for this key, it MUST be overwritten.
   */
  saveDraft(key: string, data: T): DraftResult<void>;

  /**
   * Load a draft by key.
   *
   * @returns DraftRecord<T> if found and not corrupt, DraftEmptyResult if missing,
   *          or DraftFailure on error.
   */
  loadDraft(key: string): DraftResult<DraftRecord<T>>;

  /**
   * Remove a draft by key.
   *
   * Idempotent — returns DraftEmptyResult even if the key does not exist.
   */
  removeDraft(key: string): DraftResult<void>;

  /**
   * Check whether a draft exists for the given key.
   */
  exists(key: string): DraftResult<boolean>;

  /**
   * Return all draft keys currently held by this storage.
   *
   * Implementations that do not support enumeration MUST return
   * DraftDataResult with an empty record array.
   */
  listKeys(): DraftResult<string[]>;

  /**
   * Remove expired drafts, if the implementation supports TTL.
   *
   * Implementations without TTL support MUST return DraftEmptyResult without action.
   */
  clearExpired(): DraftResult<void>;
}

/**
 * Helper: wrap a value in a successful DraftEmptyResult.
 */
export function draftEmpty(): DraftEmptyResult {
  return { success: true };
}

/**
 * Helper: wrap a value in a successful DraftDataResult.
 */
export function draftData<T>(record: T): DraftDataResult<T> {
  return { success: true, record };
}

/**
 * Helper: wrap an error code/message into a DraftFailure.
 */
export function draftFailure(
  code: ClinicalErrorCode,
  message: string,
  cause?: unknown
): DraftFailure {
  return {
    success: false,
    error: {
      code,
      category:
        code === ClinicalErrorCode.STORAGE_UNAVAILABLE
          ? ClinicalErrorCategory.INFRASTRUCTURE
          : ClinicalErrorCategory.DOCUMENTATION,
      message,
      recoverable: true,
      retryable: code === ClinicalErrorCode.STORAGE_UNAVAILABLE,
      severity: ClinicalErrorSeverity.ERROR,
      cause,
    },
  };
}
