/**
 * Shared Kernel — Draft Serialization
 *
 * Isolated serialization logic for draft persistence.
 *
 * Future storage adapters MUST use these helpers to ensure
 * a uniform on-disk/on-wire format regardless of the backing store.
 */

import type { DraftRecord } from '../interfaces/draft-storage';

/**
 * Serialize a draft record to a JSON string.
 *
 * @throws SerializationFailure if the value cannot be stringified.
 */
export function serializeDraft<T>(record: DraftRecord<T>): string {
  try {
    return JSON.stringify(record);
  } catch (cause) {
    const error = new Error(`Failed to serialize draft: ${cause}`);
    (error as any).code = 'SERIALIZATION_FAILURE';
    throw error;
  }
}

/**
 * Deserialize a JSON string into a DraftRecord.
 *
 * Returns `null` when the payload is missing, corrupt, or lacks
 * the required `structured` and `timestamp` fields.
 */
export function deserializeDraft<T>(raw: string): DraftRecord<T> | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DraftRecord<T>>;
    if (!parsed || typeof parsed.structured === 'undefined' || !parsed.timestamp) {
      return null;
    }
    return parsed as DraftRecord<T>;
  } catch {
    return null;
  }
}

/**
 * Create a new draft record with the current timestamp.
 */
export function createDraftRecord<T>(structured: T): DraftRecord<T> {
  return {
    structured,
    timestamp: new Date().toISOString(),
  };
}
