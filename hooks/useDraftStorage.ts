/**
 * useDraftStorage - Local Storage Draft Persistence
 * 
 * Handles saving and restoring drafts from localStorage.
 * Provides backup/restore functionality for offline resilience.
 */

import { useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';

export interface DraftData<T> {
  structured: T;
  timestamp: string;
}

export interface UseDraftStorageOptions<T> {
  storageKey: string;
  debounceMs?: number;
}

export interface UseDraftStorageReturn<T> {
  saveDraft: (data: T) => void;
  loadDraft: () => DraftData<T> | null;
  clearDraft: () => void;
  isDraftNewerThan: (serverTimestamp: string) => boolean;
}

/**
 * Hook for managing draft persistence to localStorage
 */
export function useDraftStorage<T>(
  options: UseDraftStorageOptions<T>
): UseDraftStorageReturn<T> {
  const { storageKey, debounceMs = 2000 } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveDraft = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const draft: DraftData<T> = {
          structured: data,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch (error) {
        console.error('Failed to save draft to localStorage:', error);
      }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  const loadDraft = useCallback((): DraftData<T> | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const draft = JSON.parse(saved) as DraftData<T>;
      if (!draft.structured || !draft.timestamp) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return draft;
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error);
      localStorage.removeItem(storageKey);
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const isDraftNewerThan = useCallback((serverTimestamp: string): boolean => {
    const draft = loadDraft();
    if (!draft) return false;

    try {
      const draftTime = new Date(draft.timestamp);
      const serverTime = new Date(serverTimestamp);
      return draftTime > serverTime;
    } catch {
      return false;
    }
  }, [loadDraft]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    isDraftNewerThan,
  };
}

/**
 * Check if there's a newer local draft compared to server data
 */
export function hasNewerDraft(
  storageKey: string,
  serverUpdatedAt: string | null | undefined
): { hasNewer: boolean; draftTime?: Date; serverTime?: Date } {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { hasNewer: false };

    const draft = JSON.parse(saved) as DraftData<unknown>;
    if (!draft.timestamp) return { hasNewer: false };

    const draftTime = new Date(draft.timestamp);
    const serverTime = serverUpdatedAt ? new Date(serverUpdatedAt) : new Date(0);

    return {
      hasNewer: draftTime > serverTime,
      draftTime,
      serverTime,
    };
  } catch {
    return { hasNewer: false };
  }
}

/**
 * Format draft timestamp for display
 */
export function formatDraftTimestamp(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'HH:mm:ss');
  } catch {
    return 'unknown time';
  }
}
