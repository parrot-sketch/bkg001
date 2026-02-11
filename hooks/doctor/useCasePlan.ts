/**
 * React Query hooks for case-centric surgical plan operations.
 *
 * Provides:
 * - useCasePlanDetail: Fetch full case + plan data by caseId
 * - useUpdateCasePlan: Partial-update plan sections
 * - useCreateConsent: Create a consent form
 * - useSignConsent: Mark a consent as signed
 * - useAddPhoto: Add a photo to a case
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casePlanApi, CasePlanDetailDto } from '@/lib/api/case-plan';
import { surgicalCaseKeys } from './useSurgicalCases';
import { toast } from 'sonner';

// ============================================================================
// Query Keys
// ============================================================================

export const casePlanKeys = {
    all: ['case-plan'] as const,
    detail: (caseId: string) => [...casePlanKeys.all, 'detail', caseId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/** Fetch full case + plan detail by surgical case ID */
export function useCasePlanDetail(caseId: string) {
    return useQuery<CasePlanDetailDto>({
        queryKey: casePlanKeys.detail(caseId),
        queryFn: async () => {
            const response = await casePlanApi.getByCaseId(caseId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch case plan');
            }
            return response.data;
        },
        enabled: !!caseId,
    });
}

// ============================================================================
// Mutations
// ============================================================================

/** Partial-update plan fields. Invalidates both plan detail and surgical cases list. */
export function useUpdateCasePlan(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Parameters<typeof casePlanApi.updatePlan>[1]) => {
            const response = await casePlanApi.updatePlan(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to update plan');
            }
            return response.data;
        },
        onSuccess: (data) => {
            toast.success('Plan saved');
            // Update the cache directly for instant UI feedback
            queryClient.setQueryData(casePlanKeys.detail(caseId), data);
            // Also invalidate the surgical cases list (readiness indicators may change)
            queryClient.invalidateQueries({ queryKey: surgicalCaseKeys.all });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/** Create a consent form for this case */
export function useCreateConsent(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { type: string; title: string }) => {
            const response = await casePlanApi.createConsent(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to create consent');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Consent form created');
            queryClient.invalidateQueries({ queryKey: casePlanKeys.detail(caseId) });
            queryClient.invalidateQueries({ queryKey: surgicalCaseKeys.all });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/** Mark a consent as signed */
export function useSignConsent(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { consentId: string; patientSignature: string; witnessName?: string }) => {
            const response = await casePlanApi.signConsent(data.consentId, {
                patientSignature: data.patientSignature,
                witnessName: data.witnessName,
            });
            if (!response.success) {
                throw new Error(response.error || 'Failed to sign consent');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Consent signed successfully');
            queryClient.invalidateQueries({ queryKey: casePlanKeys.detail(caseId) });
            queryClient.invalidateQueries({ queryKey: surgicalCaseKeys.all });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/** Add a photo to this case */
export function useAddPhoto(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Parameters<typeof casePlanApi.addPhoto>[1]) => {
            const response = await casePlanApi.addPhoto(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to add photo');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Photo added');
            queryClient.invalidateQueries({ queryKey: casePlanKeys.detail(caseId) });
            queryClient.invalidateQueries({ queryKey: surgicalCaseKeys.all });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// ============================================================================
// Team Mutations
// ============================================================================

/** Initialize the procedure record for this case */
export function useInitProcedureRecord(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await casePlanApi.initProcedureRecord(caseId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to initialize procedure record');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Procedure record initialized');
            queryClient.invalidateQueries({ queryKey: casePlanKeys.detail(caseId) });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/** Assign a staff member to this case */
export function useAssignStaff(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { userId: string; role: string }) => {
            const response = await casePlanApi.assignStaff(caseId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to assign staff');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Staff member assigned');
            queryClient.invalidateQueries({ queryKey: casePlanKeys.detail(caseId) });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/** Remove a staff member from this case */
export function useRemoveStaff(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (staffId: number) => {
            const response = await casePlanApi.removeStaff(caseId, staffId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to remove staff');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Staff member removed');
            queryClient.invalidateQueries({ queryKey: casePlanKeys.detail(caseId) });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
