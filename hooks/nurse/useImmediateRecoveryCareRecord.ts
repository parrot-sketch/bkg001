/**
 * React Hooks: Immediate Recovery Care Record
 * 
 * Hooks for fetching, saving, and finalizing the Immediate Recovery Care Record
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseFormsApi, FinalizeResult } from '@/lib/api/nurse-forms';
import { toast } from 'sonner';

export interface ImmediateRecoveryCareRecordData {
    id: number;
    status: string;
    data: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    signedByUserId?: string;
    signedAt?: string;
}

export interface SaveImmediateRecoveryCareRecordParams {
    data: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────────────────────────

export const immediateRecoveryCareKeys = {
    all: ['nurse', 'immediate-recovery-care'] as const,
    detail: (caseId: string) => [...immediateRecoveryCareKeys.all, caseId] as const,
};

/**
 * Fetch the Immediate Recovery Care Record for a surgical case
 */
export function useImmediateRecoveryCareRecord(caseId: string) {
    return useQuery<ImmediateRecoveryCareRecordData>({
        queryKey: immediateRecoveryCareKeys.detail(caseId),
        queryFn: async () => {
            const response = await nurseFormsApi.getImmediateRecoveryCareRecord(caseId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch record');
            }
            return response.data;
        },
        enabled: !!caseId,
    });
}

/**
 * Save (create or update) the Immediate Recovery Care Record
 */
export function useSaveImmediateRecoveryCareRecord(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation<{ data: { id: number; status: string } }, Error, SaveImmediateRecoveryCareRecordParams>({
        mutationFn: async (params) => {
            const response = await nurseFormsApi.saveImmediateRecoveryCareRecord(caseId, params.data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to save record');
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: immediateRecoveryCareKeys.detail(caseId) });
            toast.success('Record saved successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to save record');
        },
    });
}

/**
 * Finalize the Immediate Recovery Care Record
 */
export function useFinalizeImmediateRecoveryCareRecord(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation<FinalizeResult, Error>({
        mutationFn: async () => {
            const response = await nurseFormsApi.finalizeImmediateRecoveryCareRecord(caseId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to finalize record');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: immediateRecoveryCareKeys.detail(caseId) });
            toast.success('Record finalized and signed');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to finalize record');
        },
    });
}

export interface FinalizeValidationError {
    error: string;
    missingItems?: string[];
    details?: Array<{ path: string; message: string }>;
}
