/**
 * LocalStorage Draft Storage Adapter
 *
 * Concrete implementation of DraftStorage backed by window.localStorage.
 *
 * **Compatibility guarantees:**
 * - Existing keys of the form `consultation-draft-{appointmentId}` are read/written
 *   without migration.
 * - Serialization format `{ structured, timestamp }` matches ConsultationContext.tsx
 *   exactly.
 *
 * **Error handling:**
 * - Never throws browser exceptions to callers.
 * - Returns DraftFailure with ClinicalError on quota exceeded, security errors,
 *   or corrupt payloads.
 */

import type {
  DraftStorage,
  DraftRecord,
  DraftResult,
  DraftEmptyResult,
  DraftFailure,
} from '@/shared-kernel/interfaces/draft-storage';
import { draftData, draftEmpty, draftFailure } from '@/shared-kernel/interfaces/draft-storage';
import {
  ClinicalErrorCode,
} from '@/shared-kernel/errors/codes';
import { serializeDraft, deserializeDraft } from '@/shared-kernel/utils/draft-serialization';

const LS_PREFIX = 'consultation-draft-';

function makeKey(appointmentId: number | string): string {
  return `${LS_PREFIX}${appointmentId}`;
}

function storageUnavailable(cause?: unknown): DraftFailure {
  return draftFailure(
    ClinicalErrorCode.STORAGE_UNAVAILABLE,
    'Browser storage is unavailable',
    cause
  );
}

function draftCorrupted(cause?: unknown): DraftFailure {
  return draftFailure(
    ClinicalErrorCode.DRAFT_CORRUPTED,
    'Draft data is corrupt and could not be restored',
    cause
  );
}

/**
 * LocalStorage-backed DraftStorage implementation.
 *
 * Adheres to the DraftStorage contract without leaking browser APIs
 * through the public interface.
 */
export class LocalStorageDraftStorage<T> implements DraftStorage<T> {
  readonly capabilities = {
    supportsTTL: false,
    supportsList: true,
  };

  /**
   * Check that window.localStorage is accessible.
   */
  private isAvailable(): boolean {
    try {
      const storage = globalThis.localStorage;
      const testKey = '__storage_test__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getStorage(): Storage | null {
    if (!this.isAvailable()) return null;
    return globalThis.localStorage;
  }

  saveDraft(key: string, data: T): DraftResult<void> {
    const storage = this.getStorage();
    if (!storage) return storageUnavailable();

    try {
      const record: DraftRecord<T> = {
        structured: data,
        timestamp: new Date().toISOString(),
      };
      const serialized = serializeDraft(record);
      storage.setItem(key, serialized);
      return draftEmpty();
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        return draftFailure(
          ClinicalErrorCode.STORAGE_UNAVAILABLE,
          'Storage quota exceeded — draft could not be saved',
          error
        );
      }
      if (error instanceof Error && error.name === 'SecurityError') {
        return draftFailure(
          ClinicalErrorCode.STORAGE_UNAVAILABLE,
          'Storage access denied — check browser privacy settings',
          error
        );
      }
      return storageUnavailable(error);
    }
  }

  loadDraft(key: string): DraftResult<DraftRecord<T>> {
    const storage = this.getStorage();
    if (!storage) return storageUnavailable();

    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return draftEmpty();
      }

      const record = deserializeDraft<T>(raw);
      if (!record) {
        storage.removeItem(key);
        return draftCorrupted(raw);
      }

      return draftData(record);
    } catch (error) {
      return draftCorrupted(error);
    }
  }

  removeDraft(key: string): DraftResult<void> {
    const storage = this.getStorage();
    if (!storage) return storageUnavailable();

    try {
      storage.removeItem(key);
      return draftEmpty();
    } catch (error) {
      return storageUnavailable(error);
    }
  }

  exists(key: string): DraftResult<boolean> {
    const storage = this.getStorage();
    if (!storage) return storageUnavailable();

    try {
      const raw = storage.getItem(key);
      return draftData(raw !== null);
    } catch (error) {
      return storageUnavailable(error);
    }
  }

  listKeys(): DraftResult<string[]> {
    const storage = this.getStorage();
    if (!storage) return storageUnavailable();

    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(LS_PREFIX)) {
          keys.push(key.slice(LS_PREFIX.length));
        }
      }
      return draftData(keys);
    } catch (error) {
      return storageUnavailable(error);
    }
  }

  clearExpired(): DraftResult<void> {
    // LocalStorage adapter does not enforce TTL by default.
    // Timestamp-based expiry is a business concern handled by consumers
    // (e.g., ConsultationContext compares draft.timestamp to server.updatedAt).
    return draftEmpty();
  }
}
