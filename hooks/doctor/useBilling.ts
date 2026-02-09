/**
 * React Query Hooks: Doctor Billing Management
 * 
 * Hooks for doctor-side billing operations during consultations.
 * Enables doctors to:
 * - View billing for an appointment
 * - Add/update billing items (services rendered)
 * - Save billing during consultation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface BillItem {
  id?: number;
  serviceId: number;
  serviceName: string;
  serviceCategory?: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface AppointmentBilling {
  payment: {
    id: number;
    patientId: string;
    appointmentId: number;
    billDate: string;
    paymentDate: string | null;
    discount: number;
    totalAmount: number;
    amountPaid: number;
    paymentMethod: string;
    status: string;
    receiptNumber: string | null;
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    appointment?: {
      id: number;
      type: string;
      status: string;
      doctorName?: string;
    };
    billItems: BillItem[];
  } | null;
  appointment?: {
    id: number;
    status: string;
    type: string;
    doctorName?: string;
    consultationFee: number;
    patientName: string;
  } | null;
}

export interface SaveBillingDto {
  appointmentId: number;
  billingItems: Array<{
    serviceId: number;
    quantity: number;
    unitCost: number;
  }>;
  discount?: number;
  customTotalAmount?: number;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching billing data for an appointment
 */
export function useAppointmentBilling(appointmentId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['appointment', appointmentId, 'billing'],
    queryFn: async () => {
      if (!appointmentId) throw new Error('Appointment ID required');
      const response = await apiClient.get<AppointmentBilling>(`/appointments/${appointmentId}/billing`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load billing');
      }
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: enabled && !!appointmentId,
  });
}

/**
 * Hook for saving/updating billing items for an appointment
 */
export function useSaveBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: SaveBillingDto) => {
      const response = await apiClient.put<any>(`/appointments/${dto.appointmentId}/billing`, {
        billingItems: dto.billingItems,
        discount: dto.discount,
        customTotalAmount: dto.customTotalAmount,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save billing');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate billing query for this appointment
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.appointmentId, 'billing'] });
      // Also invalidate pending payments for frontdesk
      queryClient.invalidateQueries({ queryKey: ['payments', 'pending'] });
      toast.success(data?.message || 'Billing saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save billing');
    },
  });
}
