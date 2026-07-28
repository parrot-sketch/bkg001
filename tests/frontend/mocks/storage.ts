/**
 * Storage Mocks
 *
 * Provides mock implementations for localStorage and sessionStorage.
 */

export function mockLocalStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  get length(): number;
  key: (index: number) => string | null;
} {
  const store: Record<string, string> = {};

  const storage = {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
  };

  (globalThis as any).localStorage = storage;
  (globalThis as any).window.localStorage = storage;
  return storage;
}

export function mockSessionStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  get length(): number;
  key: (index: number) => string | null;
} {
  const store: Record<string, string> = {};

  const storage = {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
  };

  (globalThis as any).sessionStorage = storage;
  (globalThis as any).window.sessionStorage = storage;
  return storage;
}
