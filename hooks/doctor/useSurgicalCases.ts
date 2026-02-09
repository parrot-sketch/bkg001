/**
 * React Query hooks for doctor surgical case operations.
 *
 * Provides:
 * - useDoctorSurgicalCases: Fetch all surgical cases for the logged-in doctor
 * - useMarkCaseReady: Transition a case PLANNING → READY_FOR_SCHEDULING
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surgicalCasesApi, SurgicalCaseListDto } from '@/lib/api/surgical-cases';
import { toast } from 'sonner';

// ============================================================================
// Query Keys
// ============================================================================

export const surgicalCaseKeys = {
    all: ['surgical-cases'] as const,
    mine: () => [...surgicalCaseKeys.all, 'mine'] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all surgical cases assigned to the authenticated doctor.
 */
export function useDoctorSurgicalCases() {
    return useQuery<SurgicalCaseListDto[]>({
        queryKey: surgicalCaseKeys.mine(),
        queryFn: async () => {
            const response = await surgicalCasesApi.getMyCases();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch surgical cases');
            }
            return response.data;
        },
    });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mark a surgical case as ready for scheduling.
 * Invalidates the surgical cases query on success.
 */
export function useMarkCaseReady() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (caseId: string) => {
            const response = await surgicalCasesApi.markReady(caseId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to mark case as ready');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Case marked as ready for scheduling');
            queryClient.invalidateQueries({ queryKey: surgicalCaseKeys.all });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
