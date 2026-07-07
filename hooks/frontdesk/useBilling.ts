/**
 * React Query Hooks: Billing Management
 * 
 * Hooks for frontdesk billing operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { PaymentStatus } from '@/domain/enums/PaymentStatus';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

interface BillingResponse {
  payments: PaymentWithRelations[];
  summary: {
    totalBilled: number;
    totalCollected: number;
    pendingCount: number;
    paidCount: number;
  };
}

type StatusFilter = 'all' | PaymentStatus.UNPAID | PaymentStatus.PART | PaymentStatus.PAID;

/**
 * Hook for fetching payments with optional status filter
 */
export function useBillingPayments(enabled = true, statusFilter: StatusFilter = 'all') {
  return useQuery({
    queryKey: ['billing-payments', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      params.set('limit', '100');
      
      const response = await apiClient.get<BillingResponse>(`/payments/pending?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load payments');
      }
      return response.data;
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Hook for fetching pending payments (backwards compatible)
 */
export function usePendingPayments(enabled = true) {
  return useBillingPayments(enabled, 'all');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
      toast.success('Payment recorded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });
}