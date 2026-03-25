/**
 * Intake Session Hooks
 * 
 * React Query hooks for managing intake session status with proper polling.
 * Uses state-based polling - only polls when session is active.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import { toast } from 'sonner';

export type IntakeSessionStatus = 
  | 'PENDING_SUBMISSION' 
  | 'SUBMITTED' 
  | 'CONFIRMED' 
  | 'EXPIRED';

export interface IntakeSessionStatusResponse {
  sessionId: string;
  status: IntakeSessionStatus;
  expiresAt: string | null;
  patientName?: string;
  submittedAt?: string;
}

export interface UseIntakeSessionStatusOptions {
  sessionId: string | null;
  enabled?: boolean;
}

export function useIntakeSessionStatus(options: UseIntakeSessionStatusOptions) {
  const sessionId = options?.sessionId ?? null;
  const enabled = options?.enabled ?? true;

  return useQuery<IntakeSessionStatusResponse, Error>({
    queryKey: queryKeys.frontdesk.intakeSession(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('No session ID provided');
      }
      
      const response = await fetch(`/api/frontdesk/intake/${sessionId}/status`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch session status' }));
        throw new Error(error.error || 'Failed to fetch session status');
      }
      
      return response.json();
    },
    enabled: !!sessionId && enabled,
    refetchInterval: 4000, // Poll every 4 seconds while active
    staleTime: 1_000,
    gcTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useStartIntakeSession() {
  const queryClient = useQueryClient();

  return useMutation<{ sessionId: string; qrCodeUrl: string; intakeFormUrl: string; expiresAt: string; minutesRemaining: number }, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/frontdesk/intake/start', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to start intake session' }));
        throw new Error(error.error || 'Failed to start intake session');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.intakePendingCount() });
      toast.success('Intake session started');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start intake session');
    },
  });
}