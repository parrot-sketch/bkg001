/**
 * React Query Hooks: Billing Management
 * 
 * Hooks for frontdesk billing operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { queryKeys } from '@/lib/constants/queryKeys';

interface BillingResponse {
  payments: PaymentWithRelations[];
  summary: {
    totalBilled: number;
    totalCollected: number;
    pendingCount: number;
    paidCount: number;
  };
}

/**
 * Hook for fetching pending payments
 */
export function usePendingPayments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.frontdesk.pendingPayments(),
    queryFn: async () => {
      const response = await apiClient.get<BillingResponse>('/payments/pending');
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pending payments');
      }
      return response.data;
    },
    staleTime: 1000 * 60, // 60 seconds - billing is not real-time
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Hook for recording a payment
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      amountPaid,
      paymentMethod,
    }: {
      paymentId: number;
      amountPaid: number;
      paymentMethod: PaymentMethod;
    }) => {
      const response = await apiClient.post<any>(`/payments/${paymentId}/record`, {
        amountPaid,
        paymentMethod,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to record payment');
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate pending payments query - using exact key
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.pendingPayments() });
      
      toast.success(data?.message || 'Payment recorded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });
}
