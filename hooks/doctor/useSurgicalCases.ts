/**
 * React Query hooks for doctor surgical case operations.
 *
 * Provides:
 * - useDoctorSurgicalCases: Paginated, filterable surgical cases list
 * - useMarkCaseReady: Transition a case PLANNING → READY_FOR_SCHEDULING
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
    surgicalCasesApi,
    SurgicalCaseListResponse,
    SurgicalCaseQueryParams,
    ReadinessItem,
} from '@/lib/api/surgical-cases';
import { toast } from 'sonner';

// ============================================================================
// Query Keys
// ============================================================================

export const surgicalCaseKeys = {
    all: ['surgical-cases'] as const,
    mine: (params?: SurgicalCaseQueryParams) =>
        [...surgicalCaseKeys.all, 'mine', params ?? {}] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch surgical cases for the authenticated doctor.
 * Supports pagination, search, and status/urgency filters.
 *
 * Uses `keepPreviousData` for smooth pagination transitions.
 */
export function useDoctorSurgicalCases(params: SurgicalCaseQueryParams = {}) {
    return useQuery<SurgicalCaseListResponse>({
        queryKey: surgicalCaseKeys.mine(params),
        queryFn: async () => {
            const response = await surgicalCasesApi.getMyCases(params);
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch surgical cases');
            }
            return response.data;
        },
        placeholderData: keepPreviousData,
    });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Error thrown when mark-ready fails due to incomplete readiness items.
 * Contains structured data for the UI to render a targeted checklist.
 */
export class MarkReadyError extends Error {
    constructor(
        message: string,
        public readonly missingItems?: ReadinessItem[],
        public readonly completedCount?: number,
        public readonly totalRequired?: number,
    ) {
        super(message);
        this.name = 'MarkReadyError';
    }
}

/**
 * Mark a surgical case as ready for scheduling.
 * Invalidates all surgical case queries on success.
 *
 * On failure, throws MarkReadyError with structured missingItems
 * so the UI can render a targeted checklist modal.
 */
export function useMarkCaseReady() {
    const queryClient = useQueryClient();

    return useMutation<any, MarkReadyError, string>({
        mutationFn: async (caseId: string) => {
            const response = await surgicalCasesApi.markReady(caseId) as any;
            if (!response.success) {
                throw new MarkReadyError(
                    response.error || 'Failed to mark case as ready',
                    response.missingItems,
                    response.completedCount,
                    response.totalRequired,
                );
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Case marked as ready for scheduling');
            queryClient.invalidateQueries({ queryKey: surgicalCaseKeys.all });
        },
        // Don't show toast here — let the plan page handle it with a modal
    });
}
