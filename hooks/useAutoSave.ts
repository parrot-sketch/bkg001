/**
 * useAutoSave - Debounced Auto-Save Hook
 * 
 * Reusable hook for auto-saving form data with debouncing.
 * Handles save state, error handling, and cleanup.
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export interface AutoSaveOptions<T> {
  debounceMs?: number;
  onSave: (data: T) => Promise<void>;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
  enabled?: boolean;
}

export interface UseAutoSaveReturn {
  triggerSave: () => void;
  cancelPendingSave: () => void;
  isSaving: boolean;
  lastSavedStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions<T>
): UseAutoSaveReturn {
  const {
    debounceMs = 3000,
    onSave,
    onSaveSuccess,
    onSaveError,
    enabled = true,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastStatusRef = useRef<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const clearPendingSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const triggerSave = useCallback(async () => {
    if (!enabled || isSavingRef.current) return;

    isSavingRef.current = true;
    lastStatusRef.current = 'saving';

    try {
      await onSave(data);
      lastStatusRef.current = 'saved';
      onSaveSuccess?.();
    } catch (error) {
      lastStatusRef.current = 'error';
      const err = error instanceof Error ? error : new Error('Save failed');
      console.error('Auto-save failed:', err);
      onSaveError?.(err);
      toast.error('Failed to auto-save. Your changes may not be persisted.');
    } finally {
      isSavingRef.current = false;
    }
  }, [data, enabled, onSave, onSaveSuccess, onSaveError]);

  useEffect(() => {
    if (!enabled) return;

    clearPendingSave();

    timeoutRef.current = setTimeout(() => {
      triggerSave();
    }, debounceMs);

    return clearPendingSave;
  }, [data, debounceMs, enabled, triggerSave, clearPendingSave]);

  useEffect(() => {
    return clearPendingSave;
  }, [clearPendingSave]);

  return {
    triggerSave,
    cancelPendingSave: clearPendingSave,
    isSaving: isSavingRef.current,
    lastSavedStatus: lastStatusRef.current,
  };
}

/**
 * useAutoSaveWithStatus - AutoSave with React state integration
 * 
 * For use with useReducer dispatch - syncs save status to state.
 */
import { useState, useSyncExternalStore } from 'react';

export function useAutoSaveWithStatus<T>(
  data: T,
  options: AutoSaveOptions<T>
) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const autoSave = useAutoSave(data, {
    ...options,
    onSaveSuccess: () => {
      setStatus('saved');
      options.onSaveSuccess?.();
      setTimeout(() => setStatus('idle'), 2000);
    },
    onSaveError: (error) => {
      setStatus('error');
      options.onSaveError?.(error);
    },
    enabled: options.enabled,
  });

  return {
    ...autoSave,
    status,
  };
}
