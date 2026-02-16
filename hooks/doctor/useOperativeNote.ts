/**
 * React Query Hooks: Surgeon Operative Note
 *
 * Provides:
 * - useOperativeNote(caseId)          — fetch or auto-create draft
 * - useSaveOperativeNote()            — save draft updates
 * - useFinalizeOperativeNote()        — finalize and lock
 * - useImportFromIntraOp()            — refresh implants/specimens from nurse record
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    doctorOperativeNoteApi,
    OperativeNoteFormDto,
} from '@/lib/api/doctor-operative-note';
import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { toast } from 'sonner';

// ──────────────────────────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────────────────────────

export const operativeNoteKeys = {
    all: ['doctor', 'operative-note'] as const,
    detail: (caseId: string) => [...operativeNoteKeys.all, caseId] as const,
};

// ──────────────────────────────────────────────────────────────────────
// Fetch or auto-create operative note
// ──────────────────────────────────────────────────────────────────────

export function useOperativeNote(caseId: string | undefined) {
    return useQuery({
        queryKey: operativeNoteKeys.detail(caseId!),
        queryFn: async () => {
            const response = await doctorOperativeNoteApi.getOperativeNote(caseId!);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load operative note');
            }
            return response.data;
        },
        enabled: !!caseId,
        staleTime: 1000 * 15,
        gcTime: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
    });
}

// ──────────────────────────────────────────────────────────────────────
// Save draft
// ──────────────────────────────────────────────────────────────────────

export function useSaveOperativeNote(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: SurgeonOperativeNoteDraft) => {
            const response = await doctorOperativeNoteApi.saveOperativeNote(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to save operative note');
            }
            return response.data;
        },
        onSuccess: (updatedForm: OperativeNoteFormDto) => {
            queryClient.setQueryData(
                operativeNoteKeys.detail(caseId),
                (old: any) => old ? { ...old, form: updatedForm } : old,
            );
            toast.success('Operative note saved');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// ──────────────────────────────────────────────────────────────────────
// Finalize
// ──────────────────────────────────────────────────────────────────────

export class OperativeNoteFinalizeValidationError extends Error {
    missingItems: string[];
    constructor(message: string, missingItems: string[] = []) {
        super(message);
        this.name = 'OperativeNoteFinalizeValidationError';
        this.missingItems = missingItems;
    }
}

export function useFinalizeOperativeNote(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await doctorOperativeNoteApi.finalizeOperativeNote(caseId) as any;
            if (!response.success) {
                if (response.missingItems) {
                    throw new OperativeNoteFinalizeValidationError(
                        response.error || 'Cannot finalize: required fields missing',
                        response.missingItems,
                    );
                }
                throw new Error(response.error || 'Failed to finalize operative note');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Operative note finalized and signed');
            queryClient.invalidateQueries({ queryKey: operativeNoteKeys.detail(caseId) });
            queryClient.invalidateQueries({ queryKey: ['doctor'] });
        },
        onError: (error: Error) => {
            if (error instanceof OperativeNoteFinalizeValidationError) {
                toast.error(error.message, {
                    description: `Missing: ${error.missingItems.slice(0, 5).join(', ')}${error.missingItems.length > 5 ? '...' : ''}`,
                });
            } else {
                toast.error(error.message);
            }
        },
    });
}

// ──────────────────────────────────────────────────────────────────────
// Import from intra-op record
// ──────────────────────────────────────────────────────────────────────

export function useImportFromIntraOp(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await doctorOperativeNoteApi.importFromIntraOp(caseId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to import from intra-op record');
            }
            return response.data;
        },
        onSuccess: (updatedForm: OperativeNoteFormDto) => {
            queryClient.setQueryData(
                operativeNoteKeys.detail(caseId),
                (old: any) => old ? { ...old, form: updatedForm } : old,
            );
            toast.success('Implants and specimens imported from intra-op record');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
