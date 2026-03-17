/**
 * Hook: useOperativeTimeline
 *
 * Provides timeline data for surgical cases with proper auth handling.
 * Uses apiClient which handles token authentication internally.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, ApiResponse } from '@/lib/api/client';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';

export const timelineKeys = {
    all: ['timeline'] as const,
    detail: (caseId: string) => [...timelineKeys.all, caseId] as const,
};

async function fetchTimeline(caseId: string): Promise<TimelineResultDto> {
    const response = await apiClient.get<TimelineResultDto>(
        `/theater-tech/surgical-cases/${caseId}/timeline`
    );
    if (!response.success) {
        throw new Error(response.error || 'Failed to fetch timeline');
    }
    return response.data;
}

async function updateTimeline(
    caseId: string,
    timestamps: Record<string, string>
): Promise<TimelineResultDto> {
    const response = await apiClient.patch<TimelineResultDto>(
        `/theater-tech/surgical-cases/${caseId}/timeline`,
        timestamps
    );
    if (!response.success) {
        const error = new Error(response.error || 'Timeline update failed');
        throw error;
    }
    return response.data;
}

export function useOperativeTimeline(caseId: string | undefined) {
    return useQuery({
        queryKey: timelineKeys.detail(caseId || ''),
        queryFn: () => fetchTimeline(caseId!),
        enabled: !!caseId,
        staleTime: 1000 * 10,
        refetchOnWindowFocus: true,
    });
}

export function useUpdateOperativeTimeline() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { caseId: string; timestamps: Record<string, string> }) =>
            updateTimeline(args.caseId, args.timestamps),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: timelineKeys.detail(variables.caseId) });
            toast.success('Timeline updated');
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Timeline update failed');
        },
    });
}
