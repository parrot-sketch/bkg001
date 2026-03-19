/**
 * Hook: useCaseTransition
 *
 * Mutation hook for transitioning surgical cases through statuses.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiResponse, isSuccess, ApiErrorCode } from '@/lib/http/apiResponse';
import { extractMissingItems, isGateBlockedError } from '@/lib/theater-tech/dayboardHelpers';
import { tokenStorage } from '@/lib/auth/token';

function getToken(): string | null {
  return tokenStorage.getAccessToken();
}

interface TransitionRequest {
  caseId: string;
  action: string;
  reason?: string;
}

interface TransitionResponse {
  caseId: string;
  previousStatus: string;
  newStatus: string;
}

async function transitionCase(
  caseId: string,
  action: string,
  reason?: string
): Promise<TransitionResponse> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/cases/${caseId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, reason }),
  });
  const json: ApiResponse<TransitionResponse> = await res.json();
  if (!isSuccess(json)) {
    const error = new Error(json.error || 'Transition failed');
    // Attach metadata for error handling
    (error as { code?: string; missingItems?: string[]; blockingCategory?: string }).code = json.code;
    (error as { missingItems?: string[] }).missingItems = json.metadata?.missingItems;
    (error as { blockingCategory?: string }).blockingCategory = json.metadata?.blockingCategory;
    throw error;
  }
  return json.data;
}

export function useCaseTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: TransitionRequest) => transitionCase(args.caseId, args.action, args.reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      toast.success(`Case transitioned to ${data.newStatus.replace(/_/g, ' ')}`, {
        description: `Case ${variables.caseId}`,
      });
    },
    onError: (error: Error) => {
      if (isGateBlockedError(error)) {
        const missingItems = extractMissingItems(error);
        toast.error('Transition blocked', {
          description: missingItems.length > 0 ? missingItems.slice(0, 3).join(', ') : error.message,
        });
      } else {
        toast.error(error.message || 'Transition failed');
      }
    },
  });
}
