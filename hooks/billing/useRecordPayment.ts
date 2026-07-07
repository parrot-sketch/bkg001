import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';

interface RecordPaymentParams {
  paymentId: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      const response = await fetch(`/api/payments/${params.paymentId}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: params.amountPaid,
          paymentMethod: params.paymentMethod,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to record payment');
      }

      const isPaid = result.data?.status === 'PAID';
      if (isPaid) {
        try {
          await fetch(`/api/appointments/${params.paymentId}/billing/finalize`, {
            method: 'POST',
          });
        } catch (finalizeError) {
          console.warn('Payment recorded but charge sheet finalize failed:', finalizeError);
        }
      }

      return result.data;
    },
    onSuccess: (data) => {
      const isPaid = data?.status === 'PAID';
      toast.success(isPaid ? 'Payment completed and charge sheet finalized' : 'Partial payment recorded');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });

  return {
    recordPayment: mutation.mutate,
    isPending: mutation.isPending,
  };
}
