import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

export type IntakeSessionStatus =
  | 'ACTIVE'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'EXPIRED';

export interface IntakeSessionStatusResponse {
  sessionId: string;
  status: IntakeSessionStatus;
  expiresAt: string;
  patientName?: string;
  submittedAt?: string;
}

export interface StartIntakeResponse {
  sessionId: string;
  qrCodeUrl: string;
  intakeFormUrl: string;
  expiresAt: string;
  minutesRemaining: number;
}

export function useIntakeSessionStatus(options: {
  sessionId: string | null;
  enabled?: boolean;
}) {
  const sessionId = options?.sessionId ?? null;
  const enabled = options?.enabled ?? true;

  return useQuery<IntakeSessionStatusResponse, Error>({
    queryKey: queryKeys.frontdesk.intakeSession(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID provided');

      const result = await apiClient.get<IntakeSessionStatusResponse>(
        `/frontdesk/intake/${sessionId}/status`,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!sessionId && enabled,
    refetchInterval: (query) =>
      query.state.data?.status === 'ACTIVE' ? 15_000 : false,
    staleTime: 15_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });
}

export function useStartIntakeSession() {
  const queryClient = useQueryClient();

  return useMutation<StartIntakeResponse, Error>({
    mutationFn: async () => {
      const result = await apiClient.post<StartIntakeResponse>(
        '/frontdesk/intake/start',
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
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
