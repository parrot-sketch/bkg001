/**
 * React Query Hooks: Nurse Recovery / PACU Record
 *
 * Provides:
 * - useRecoveryRecord(caseId)          — fetch or auto-create draft
 * - useSaveRecoveryRecord()            — save draft updates
 * - useFinalizeRecoveryRecord()        — finalize and lock
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseRecoveryApi, RecoveryFormDto } from '@/lib/api/nurse-forms';
import type { NurseRecoveryRecordDraft } from '@/domain/clinical-forms/NurseRecoveryRecord';
import { toast } from 'sonner';

// ──────────────────────────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────────────────────────

export const recoveryRecordKeys = {
    all: ['nurse', 'recovery-record'] as const,
    detail: (caseId: string) => [...recoveryRecordKeys.all, caseId] as const,
};

// ──────────────────────────────────────────────────────────────────────
// Fetch or auto-create recovery record
// ──────────────────────────────────────────────────────────────────────

export function useRecoveryRecord(caseId: string | undefined) {
    return useQuery({
        queryKey: recoveryRecordKeys.detail(caseId!),
        queryFn: async () => {
            const response = await nurseRecoveryApi.getRecoveryRecord(caseId!);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load recovery record');
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

export function useSaveRecoveryRecord(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: NurseRecoveryRecordDraft) => {
            const response = await nurseRecoveryApi.saveRecoveryRecord(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to save recovery record');
            }
            return response.data;
        },
        onSuccess: (updatedForm: RecoveryFormDto) => {
            queryClient.setQueryData(
                recoveryRecordKeys.detail(caseId),
                (old: any) => old ? { ...old, form: updatedForm } : old,
            );
            toast.success('Recovery record saved');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// ──────────────────────────────────────────────────────────────────────
// Finalize
// ──────────────────────────────────────────────────────────────────────

export class RecoveryFinalizeValidationError extends Error {
    missingItems: string[];
    constructor(message: string, missingItems: string[] = []) {
        super(message);
        this.name = 'RecoveryFinalizeValidationError';
        this.missingItems = missingItems;
    }
}

export function useFinalizeRecoveryRecord(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await nurseRecoveryApi.finalizeRecoveryRecord(caseId) as any;
            if (!response.success) {
                if (response.missingItems) {
                    throw new RecoveryFinalizeValidationError(
                        response.error || 'Cannot finalize: required fields missing',
                        response.missingItems,
                    );
                }
                throw new Error(response.error || 'Failed to finalize recovery record');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Recovery record finalized and signed');
            queryClient.invalidateQueries({ queryKey: recoveryRecordKeys.detail(caseId) });
            queryClient.invalidateQueries({ queryKey: ['nurse'] });
        },
        onError: (error: Error) => {
            if (error instanceof RecoveryFinalizeValidationError) {
                toast.error(error.message, {
                    description: `Missing: ${error.missingItems.slice(0, 5).join(', ')}${error.missingItems.length > 5 ? '...' : ''}`,
                });
            } else {
                toast.error(error.message);
            }
        },
    });
}
