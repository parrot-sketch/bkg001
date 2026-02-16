/**
 * React Query Hooks: Nurse Pre-Op Ward Checklist
 *
 * Provides:
 * - usePreopWardChecklist(caseId)  — fetch or auto-create draft
 * - useSavePreopWardChecklist()    — save draft updates
 * - useFinalizePreopWardChecklist() — finalize and lock
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseFormsApi, PreopWardFormDto } from '@/lib/api/nurse-forms';
import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { toast } from 'sonner';

// ──────────────────────────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────────────────────────

export const preopWardChecklistKeys = {
    all: ['nurse', 'preop-ward-checklist'] as const,
    detail: (caseId: string) => [...preopWardChecklistKeys.all, caseId] as const,
};

// ──────────────────────────────────────────────────────────────────────
// Fetch or auto-create checklist
// ──────────────────────────────────────────────────────────────────────

export function usePreopWardChecklist(caseId: string | undefined) {
    return useQuery({
        queryKey: preopWardChecklistKeys.detail(caseId!),
        queryFn: async () => {
            const response = await nurseFormsApi.getPreopWardChecklist(caseId!);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load checklist');
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

export function useSavePreopWardChecklist(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: NursePreopWardChecklistDraft) => {
            const response = await nurseFormsApi.savePreopWardChecklist(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to save checklist');
            }
            return response.data;
        },
        onSuccess: (updatedForm) => {
            // Update the cache with the new form data
            queryClient.setQueryData(
                preopWardChecklistKeys.detail(caseId),
                (old: any) => old ? { ...old, form: updatedForm } : old,
            );
            toast.success('Checklist saved');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// ──────────────────────────────────────────────────────────────────────
// Finalize
// ──────────────────────────────────────────────────────────────────────

export class FinalizeValidationError extends Error {
    missingItems: string[];
    constructor(message: string, missingItems: string[] = []) {
        super(message);
        this.name = 'FinalizeValidationError';
        this.missingItems = missingItems;
    }
}

export function useFinalizePreopWardChecklist(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await nurseFormsApi.finalizePreopWardChecklist(caseId) as any;
            if (!response.success) {
                if (response.missingItems) {
                    throw new FinalizeValidationError(
                        response.error || 'Cannot finalize: required fields missing',
                        response.missingItems,
                    );
                }
                throw new Error(response.error || 'Failed to finalize checklist');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Checklist finalized and signed');
            queryClient.invalidateQueries({ queryKey: preopWardChecklistKeys.detail(caseId) });
            // Also invalidate pre-op cases list so readiness status updates
            queryClient.invalidateQueries({ queryKey: ['nurse', 'pre-op'] });
        },
        onError: (error: Error) => {
            if (error instanceof FinalizeValidationError) {
                toast.error(error.message, {
                    description: `Missing: ${error.missingItems.slice(0, 5).join(', ')}${error.missingItems.length > 5 ? '...' : ''}`,
                });
            } else {
                toast.error(error.message);
            }
        },
    });
}
