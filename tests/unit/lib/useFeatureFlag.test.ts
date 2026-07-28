/**
 * useFeatureFlag Hook Tests
 *
 * Tests the local storage fallback and env fallback behavior.
 * The hook contains no React context dependency and can be
 * tested as a plain function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFeatureFlag } from '@/shared-kernel/flags/useFeatureFlag';

describe('shared-kernel/flags/useFeatureFlag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('returns true when localStorage has "true"', () => {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
    });

    mockStorage.setItem('feature_flag_use_draft_service', 'true');
    expect(useFeatureFlag('USE_DRAFT_SERVICE')).toBe(true);
    mockStorage.removeItem('feature_flag_use_draft_service');
  });

  it('returns false when localStorage has "false"', () => {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
    });

    mockStorage.setItem('feature_flag_use_draft_service', 'false');
    expect(useFeatureFlag('USE_DRAFT_SERVICE')).toBe(false);
    mockStorage.removeItem('feature_flag_use_draft_service');
  });

  it('does not throw when localStorage throws', () => {
    const mockStorage: Storage = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
    });

    expect(() => useFeatureFlag('USE_DRAFT_SERVICE')).not.toThrow();
  });

  it('falls back to env when localStorage is undefined', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    });

    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = 'true';
    expect(useFeatureFlag('USE_DRAFT_SERVICE')).toBe(true);
    delete process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE;
  });

  it('falls back to env when localStorage key is missing', () => {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
    });

    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = '1';
    expect(useFeatureFlag('USE_DRAFT_SERVICE')).toBe(true);
    delete process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE;
  });
});
