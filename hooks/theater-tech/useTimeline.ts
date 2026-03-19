/**
 * Hook: useTimeline
 *
 * Hooks for operative timeline operations (fetch, update).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';
import { ApiResponse, isSuccess } from '@/lib/http/apiResponse';
import { tokenStorage } from '@/lib/auth/token';

function getToken(): string | null {
  return tokenStorage.getAccessToken();
}

// ── Fetch Timeline ──

async function fetchTimeline(caseId: string): Promise<TimelineResultDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/timeline`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: ApiResponse<TimelineResultDto> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to fetch timeline');
  }
  return json.data;
}

export function useTimeline(caseId: string) {
  return useQuery<TimelineResultDto>({
    queryKey: ['timeline', caseId],
    queryFn: () => fetchTimeline(caseId),
    enabled: !!caseId,
  });
}

// ── Update Timeline ──

async function updateTimeline(
  caseId: string,
  timestamps: Record<string, string>
): Promise<TimelineResultDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/timeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(timestamps),
  });
  const json: ApiResponse<TimelineResultDto> = await res.json();
  if (!isSuccess(json)) {
    const error = new Error(json.error || 'Timeline update failed');
    (error as { errors?: Array<{ field: string; message: string }> }).errors =
      json.metadata?.errors;
    throw error;
  }
  return json.data;
}

export function useUpdateTimeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { caseId: string; timestamps: Record<string, string> }) =>
      updateTimeline(args.caseId, args.timestamps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      toast.success('Timeline updated');
    },
    onError: (err: Error) => {
      const errors = (err as { errors?: Array<{ field: string; message: string }> }).errors;
      if (errors && errors.length > 0) {
        toast.error('Timeline validation failed', {
          description: errors.map((e) => e.message).join('; '),
        });
      } else {
        toast.error(err.message || 'Timeline update failed');
      }
    },
  });
}
