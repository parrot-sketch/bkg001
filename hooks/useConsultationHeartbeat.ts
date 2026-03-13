/**
 * useConsultationHeartbeat - Session Activity Hook
 * 
 * Sends periodic heartbeat signals to prevent session timeout
 * and enable cleanup of abandoned sessions.
 */

import { useEffect, useRef, useCallback } from 'react';

export interface UseHeartbeatOptions {
  intervalMs?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function useConsultationHeartbeat(
  consultationId: number | undefined,
  options: UseHeartbeatOptions = {}
) {
  const { intervalMs = 30000, enabled = true, onError } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!consultationId) return;

    try {
      const response = await fetch(
        `/api/consultations/${consultationId}/heartbeat`,
        { method: 'POST' }
      );

      if (!response.ok) {
        console.warn('[Heartbeat] Non-200 response:', response.status);
      }
    } catch (error) {
      console.warn('[Heartbeat] Failed to send:', error);
      onError?.(error instanceof Error ? error : new Error('Heartbeat failed'));
    }
  }, [consultationId, onError]);

  useEffect(() => {
    if (!enabled || !consultationId) return;

    sendHeartbeat();

    intervalRef.current = setInterval(sendHeartbeat, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [consultationId, intervalMs, enabled, sendHeartbeat]);

  return {
    sendHeartbeat,
    isActive: enabled && !!consultationId,
  };
}
