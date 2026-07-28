/**
 * React Query Hook: useSaveConsultationDraft
 * 
 * Saves draft consultation notes with optimistic updates and version safety.
 * 
 * Note: Requires @tanstack/react-query to be installed.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/lib/api/consultation';
import { toast } from 'sonner';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { isVersionConflict } from '@/shared-kernel/utils/version-conflict';

/**
 * Hook to save consultation draft
 */
export function useSaveConsultationDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    ConsultationResponseDto,
    Error,
    SaveConsultationDraftDto,
    { previousConsultation: ConsultationResponseDto | null | undefined }
  >({
    mutationFn: async (dto) => {
      const response = await consultationApi.saveDraft(dto.appointmentId, dto);
      if (!response.success) {
        const error = new Error(response.error || 'Failed to save draft');
        if (isVersionConflict(response.error)) {
          (error as any).code = 'VERSION_CONFLICT';
        }
        throw error;
      }
      return response.data;
    },
    onMutate: async (newDraft) => {
      await queryClient.cancelQueries({ queryKey: ['consultation', newDraft.appointmentId] });

      const previousConsultation = queryClient.getQueryData<ConsultationResponseDto | null>(
        ['consultation', newDraft.appointmentId]
      );

      return { previousConsultation };
    },
    onError: (err, newDraft, context) => {
      // Rollback on error
      if (context?.previousConsultation !== undefined) {
        queryClient.setQueryData(
          ['consultation', newDraft.appointmentId],
          context.previousConsultation
        );
      }

      // Handle version conflict specifically
      if (isVersionConflict(err.message) || isVersionConflict((err as any).code)) {
        // Refetch to get latest version
        queryClient.invalidateQueries({ queryKey: ['consultation', newDraft.appointmentId] });
        toast.error('Consultation was updated. Please refresh and try again.');
      } else {
        toast.error('Failed to save draft. Please try again.');
      }
    },
    onSuccess: (data, variables) => {
      // Update cache with server response
      queryClient.setQueryData(['consultation', variables.appointmentId], data);
      // Don't show toast on auto-save (too noisy)
      // toast.success('Draft saved');
    },
    retry: (failureCount, error) => {
      if (isVersionConflict(error.message) || isVersionConflict((error as any).code)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
