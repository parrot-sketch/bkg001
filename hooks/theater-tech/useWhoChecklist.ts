/**
 * Hook: useWhoChecklist
 *
 * Hooks for WHO checklist operations (fetch, save draft, finalize).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ChecklistStatusDto } from '@/application/dtos/TheaterTechDtos';
import { ApiResponse, isSuccess, ApiErrorCode } from '@/lib/http/apiResponse';
import { extractMissingItems, isGateBlockedError } from '@/lib/theater-tech/dayboardHelpers';

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

export interface ChecklistItemPayload {
  key: string;
  label: string;
  confirmed: boolean;
  note?: string;
}

// ── Fetch Checklist Status ──

async function fetchChecklistStatus(caseId: string): Promise<ChecklistStatusDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/checklist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: ApiResponse<ChecklistStatusDto> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to fetch checklist');
  }
  return json.data;
}

export function useChecklistStatus(caseId: string) {
  return useQuery<ChecklistStatusDto>({
    queryKey: ['checklist-status', caseId],
    queryFn: () => fetchChecklistStatus(caseId),
    enabled: !!caseId,
  });
}

// ── Save Draft ──

async function saveChecklistDraft(
  caseId: string,
  phase: string,
  items: ChecklistItemPayload[]
): Promise<ChecklistStatusDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/checklist`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phase, items }),
  });
  const json: ApiResponse<ChecklistStatusDto> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Draft save failed');
  }
  return json.data;
}

export function useSaveChecklistDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { caseId: string; phase: string; items: ChecklistItemPayload[] }) =>
      saveChecklistDraft(args.caseId, args.phase, args.items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-status'] });
      toast.success('Checklist draft saved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save draft');
    },
  });
}

// ── Finalize Phase ──

async function finalizeChecklistPhase(
  caseId: string,
  phase: string,
  items: ChecklistItemPayload[]
): Promise<ChecklistStatusDto> {
  const phasePath =
    phase === 'SIGN_IN' ? 'sign-in' : phase === 'TIME_OUT' ? 'time-out' : 'sign-out';
  const token = getToken();
  const res = await fetch(
    `/api/theater-tech/surgical-cases/${caseId}/checklist/${phasePath}/finalize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    }
  );
  const json: ApiResponse<ChecklistStatusDto> = await res.json();
  if (!isSuccess(json)) {
    const error = new Error(json.error || 'Finalization failed');
    (error as { code?: string; missingItems?: string[] }).code = json.code;
    (error as { missingItems?: string[] }).missingItems = json.metadata?.missingItems;
    throw error;
  }
  return json.data;
}

export function useFinalizeChecklistPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { caseId: string; phase: string; items: ChecklistItemPayload[] }) =>
      finalizeChecklistPhase(args.caseId, args.phase, args.items),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-status'] });
      const phaseLabel =
        variables.phase === 'SIGN_IN'
          ? 'Sign-In'
          : variables.phase === 'TIME_OUT'
          ? 'Time-Out'
          : 'Sign-Out';
      toast.success(`WHO ${phaseLabel} finalized`);
    },
    onError: (err: Error) => {
      if (isGateBlockedError(err)) {
        const missingItems = extractMissingItems(err);
        toast.error('Cannot finalize — incomplete items', {
          description: missingItems.length > 0 ? missingItems.slice(0, 4).join(', ') : err.message,
        });
      } else {
        toast.error(err.message || 'Finalization failed');
      }
    },
  });
}
