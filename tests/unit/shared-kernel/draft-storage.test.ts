import { describe, it, expect, beforeEach } from 'vitest';
import { DraftStorage, draftEmpty, draftData, draftFailure } from '@/shared-kernel/interfaces/draft-storage';
import { serializeDraft, deserializeDraft, createDraftRecord } from '@/shared-kernel/utils/draft-serialization';
import { LocalStorageDraftStorage } from '@/lib/storage/local-storage-draft';

// Mock localStorage
const storageMap = new Map<string, string>();

const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, value); },
  removeItem: (key: string) => { storageMap.delete(key); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  clear: () => { storageMap.clear(); },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

describe('DraftStorage Contract', () => {
  it('draftEmpty creates a successful empty result', () => {
    const result = draftEmpty();
    expect(result.success).toBe(true);
    expect((result as any).record).toBeUndefined();
  });

  it('draftData creates a successful data result with record', () => {
    const result = draftData({ structured: { a: 1 }, timestamp: '2024-01-01T00:00:00Z' });
    expect(result.success).toBe(true);
    expect(result.record).toEqual({ structured: { a: 1 }, timestamp: '2024-01-01T00:00:00Z' });
  });

  it('draftFailure creates a failure result with ClinicalError', () => {
    const result = draftFailure('DRAFT_CORRUPTED', 'data is corrupt');
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('DRAFT_CORRUPTED');
      expect(result.error.message).toBe('data is corrupt');
      expect(result.error.category).toBe('DOCUMENTATION');
      expect(result.error.severity).toBe('ERROR');
    }
  });
});

describe('Draft Serialization', () => {
  it('serializes and deserializes a draft record', () => {
    const record = { structured: { text: 'hello' }, timestamp: '2024-01-01T00:00:00Z' };
    const serialized = serializeDraft(record);
    const deserialized = deserializeDraft(serialized);
    expect(deserialized).toEqual(record);
  });

  it('createDraftRecord produces a record with ISO timestamp', () => {
    const record = createDraftRecord({ text: 'hello' });
    expect(record.structured).toEqual({ text: 'hello' });
    expect(record.timestamp).toBeTruthy();
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
  });

  it('returns null for corrupt or empty payloads', () => {
    expect(deserializeDraft('null')).toBeNull();
    expect(deserializeDraft('{}')).toBeNull();
    expect(deserializeDraft('{"structured":{}}')).toBeNull();
    expect(deserializeDraft('not json')).toBeNull();
  });
});

describe('LocalStorageDraftStorage', () => {
  let storage: LocalStorageDraftStorage<{ text: string }>;

  beforeEach(() => {
    storageMap.clear();
    storage = new LocalStorageDraftStorage();
  });

  it('saves a draft and returns empty success', () => {
    const saveResult = storage.saveDraft('consultation-draft-123', { text: 'consultation notes' });
    expect(saveResult.success).toBe(true);
    expect((saveResult as any).record).toBeUndefined();
  });

  it('loads a saved draft with structured data and timestamp', () => {
    storage.saveDraft('consultation-draft-123', { text: 'consultation notes' });
    const loadResult = storage.loadDraft('consultation-draft-123');
    expect(loadResult.success).toBe(true);
    if (loadResult.success === true) {
      expect(loadResult.record.structured).toEqual({ text: 'consultation notes' });
      expect(loadResult.record.timestamp).toBeTruthy();
    }
  });

  it('returns empty success for load on missing key', () => {
    const result = storage.loadDraft('consultation-draft-999');
    expect(result.success).toBe(true);
  });

  it('removes a draft', () => {
    storage.saveDraft('consultation-draft-123', { text: 'a' });
    const existsResult = storage.exists('consultation-draft-123');
    expect(existsResult.success).toBe(true);
    if (existsResult.success === true) {
      expect(existsResult.record).toBe(true);
    }

    const removeResult = storage.removeDraft('consultation-draft-123');
    expect(removeResult.success).toBe(true);

    const afterExists = storage.exists('consultation-draft-123');
    expect(afterExists.success).toBe(true);
    if (afterExists.success === true) {
      expect(afterExists.record).toBe(false);
    }
  });

  it('lists draft keys', () => {
    storage.saveDraft('consultation-draft-1', { text: 'a' });
    storage.saveDraft('consultation-draft-2', { text: 'b' });

    const listResult = storage.listKeys();
    expect(listResult.success).toBe(true);
    if (listResult.success === true) {
      expect(listResult.record).toEqual(['1', '2']);
    }
  });

  it('handles corrupt data by removing it and returning failure', () => {
    mockStorage.setItem('consultation-draft-5', 'corrupt json {{{');
    const result = storage.loadDraft('consultation-draft-5');
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('DRAFT_CORRUPTED');
    }
    expect(mockStorage.getItem('consultation-draft-5')).toBeNull();
  });

  it('returns STORAGE_UNAVAILABLE when localStorage is inaccessible', () => {
    const originalSetItem = mockStorage.setItem;
    mockStorage.setItem = () => { throw new Error('SecurityError'); };

    const result = storage.saveDraft('consultation-draft-1', { text: 'a' });
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('STORAGE_UNAVAILABLE');
    }

    mockStorage.setItem = originalSetItem;
  });

  it('clearExpired is a no-op for localStorage', () => {
    const result = storage.clearExpired();
    expect(result.success).toBe(true);
  });

  it('preserves compatibility with ConsultationContext key format', () => {
    const appointmentId = 42;
    const formattedKey = `consultation-draft-${appointmentId}`;
    storage.saveDraft(formattedKey, { text: 'legacy format' });
    const loadResult = storage.loadDraft(formattedKey);
    expect(loadResult.success).toBe(true);
    if (loadResult.success === true) {
      expect(loadResult.record.structured).toEqual({ text: 'legacy format' });
    }
  });
});
