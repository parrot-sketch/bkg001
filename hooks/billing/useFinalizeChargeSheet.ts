import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FinalizeChargeSheetParams {
  appointmentId: number;
}

export function useFinalizeChargeSheet() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: FinalizeChargeSheetParams) => {
      const response = await fetch(`/api/appointments/${params.appointmentId}/billing/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to finalize charge sheet');
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Charge sheet finalized successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to finalize charge sheet');
    },
  });

  return {
    finalizeChargeSheet: mutation.mutate,
    isPending: mutation.isPending,
  };
}
