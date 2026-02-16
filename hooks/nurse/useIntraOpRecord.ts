/**
 * React Query Hooks: Nurse Intra-Op Record
 *
 * Provides:
 * - useIntraOpRecord(caseId)          — fetch or auto-create draft
 * - useSaveIntraOpRecord()            — save draft updates
 * - useFinalizeIntraOpRecord()        — finalize and lock
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseIntraOpApi, IntraOpFormDto } from '@/lib/api/nurse-forms';
import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { toast } from 'sonner';

// ──────────────────────────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────────────────────────

export const intraOpRecordKeys = {
    all: ['nurse', 'intraop-record'] as const,
    detail: (caseId: string) => [...intraOpRecordKeys.all, caseId] as const,
};

// ──────────────────────────────────────────────────────────────────────
// Fetch or auto-create intra-op record
// ──────────────────────────────────────────────────────────────────────

export function useIntraOpRecord(caseId: string | undefined) {
    return useQuery({
        queryKey: intraOpRecordKeys.detail(caseId!),
        queryFn: async () => {
            const response = await nurseIntraOpApi.getIntraOpRecord(caseId!);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load intra-op record');
            }
            return response.data;
        },
        enabled: !!caseId,
        staleTime: 1000 * 15, // 15s — clinical form, keep fresh
        gcTime: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
    });
}

// ──────────────────────────────────────────────────────────────────────
// Save draft
// ──────────────────────────────────────────────────────────────────────

export function useSaveIntraOpRecord(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: NurseIntraOpRecordDraft) => {
            const response = await nurseIntraOpApi.saveIntraOpRecord(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to save intra-op record');
            }
            return response.data;
        },
        onSuccess: (updatedForm: IntraOpFormDto) => {
            // Update the cache with the new form data
            queryClient.setQueryData(
                intraOpRecordKeys.detail(caseId),
                (old: any) => old ? { ...old, form: updatedForm } : old,
            );
            toast.success('Intra-op record saved');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// ──────────────────────────────────────────────────────────────────────
// Finalize
// ──────────────────────────────────────────────────────────────────────

export class IntraOpFinalizeValidationError extends Error {
    missingItems: string[];
    constructor(message: string, missingItems: string[] = []) {
        super(message);
        this.name = 'IntraOpFinalizeValidationError';
        this.missingItems = missingItems;
    }
}

export function useFinalizeIntraOpRecord(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await nurseIntraOpApi.finalizeIntraOpRecord(caseId) as any;
            if (!response.success) {
                if (response.missingItems) {
                    throw new IntraOpFinalizeValidationError(
                        response.error || 'Cannot finalize: required fields missing',
                        response.missingItems,
                    );
                }
                throw new Error(response.error || 'Failed to finalize intra-op record');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Intra-op record finalized and signed');
            queryClient.invalidateQueries({ queryKey: intraOpRecordKeys.detail(caseId) });
            // Also invalidate nurse case lists so status updates
            queryClient.invalidateQueries({ queryKey: ['nurse'] });
        },
        onError: (error: Error) => {
            if (error instanceof IntraOpFinalizeValidationError) {
                toast.error(error.message, {
                    description: `Missing: ${error.missingItems.slice(0, 5).join(', ')}${error.missingItems.length > 5 ? '...' : ''}`,
                });
            } else {
                toast.error(error.message);
            }
        },
    });
}
