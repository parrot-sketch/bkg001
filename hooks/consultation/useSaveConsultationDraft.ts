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
        // Check for version conflict
        if (response.error?.includes('updated by another session') || 
            response.error?.includes('VERSION_CONFLICT')) {
          (error as any).code = 'VERSION_CONFLICT';
        }
        throw error;
      }
      return response.data;
    },
    onMutate: async (newDraft) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['consultation', newDraft.appointmentId] });

      // Snapshot previous value
      const previousConsultation = queryClient.getQueryData<ConsultationResponseDto | null>(
        ['consultation', newDraft.appointmentId]
      );

      // Optimistically update
      if (previousConsultation) {
        const fullText = newDraft.notes.rawText || 
          (newDraft.notes.structured ? 
            formatStructuredNotes(newDraft.notes.structured) : '');

        queryClient.setQueryData<ConsultationResponseDto | null>(
          ['consultation', newDraft.appointmentId],
          {
            ...previousConsultation,
            notes: {
              fullText,
              structured: newDraft.notes.structured,
            },
            outcomeType: newDraft.outcomeType ?? previousConsultation.outcomeType,
            patientDecision: newDraft.patientDecision ?? previousConsultation.patientDecision,
            updatedAt: new Date(), // Optimistic timestamp
          }
        );
      }

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
      if ((err as any).code === 'VERSION_CONFLICT' || 
          err.message.includes('updated by another session')) {
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
      // Don't retry version conflicts
      if ((error as any).code === 'VERSION_CONFLICT' || 
          error.message.includes('updated by another session')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Format structured notes to full text
 */
function formatStructuredNotes(structured: {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}): string {
  const parts: string[] = [];
  if (structured.chiefComplaint) {
    parts.push(`Chief Complaint: ${structured.chiefComplaint}`);
  }
  if (structured.examination) {
    parts.push(`Examination: ${structured.examination}`);
  }
  if (structured.assessment) {
    parts.push(`Assessment: ${structured.assessment}`);
  }
  if (structured.plan) {
    parts.push(`Plan: ${structured.plan}`);
  }
  return parts.join('\n\n');
}
