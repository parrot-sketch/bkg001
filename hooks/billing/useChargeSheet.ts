import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface BillItem {
  id?: number;
  serviceId?: number;
  inventoryItemId?: number;
  serviceName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  isInventory: boolean;
}

export interface SaveBillItem {
  serviceId?: number;
  inventoryItemId?: number;
  quantity: number;
  unitCost: number;
}

export interface ChargeSheet {
  id: number;
  appointmentId: number;
  patientId: string;
  patientName: string;
  doctorName?: string;
  billDate: string;
  paymentDate?: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  discount: number;
  balance: number;
  paymentMethod?: string;
  receiptNumber?: string;
  chargeSheetNo?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  billItems: BillItem[];
  canEdit: boolean;
}

export interface ChargeSheetState {
  payment: ChargeSheet | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export function useChargeSheet(appointmentId: number | null, enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<ChargeSheet | null>({
    queryKey: ['appointments', appointmentId, 'billing'],
    queryFn: async () => {
      if (!appointmentId) return null;
      const response = await fetch(`/api/appointments/${appointmentId}/billing`);
      if (!response.ok) throw new Error('Failed to load charge sheet');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to load charge sheet');

      const payment = result.data.payment;
      if (!payment) return null;

      return mapPaymentToChargeSheet(payment, result.data.appointment);
    },
    enabled: enabled && !!appointmentId,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { billingItems: SaveBillItem[]; discount?: number; customTotalAmount?: number }) => {
      if (!appointmentId) throw new Error('Missing appointment');
      const response = await fetch(`/api/appointments/${appointmentId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save charge sheet');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', appointmentId, 'billing'] });
      toast.success('Charge sheet updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save charge sheet');
    },
  });

  const chargeSheet = data;

  return {
    chargeSheet,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    saveChargeSheet: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}

function mapPaymentToChargeSheet(payment: any, appointment: any): ChargeSheet {
  const totalAmount = Number(payment.totalAmount || 0);
  const amountPaid = Number(payment.amountPaid || 0);
  const discount = Number(payment.discount || 0);
  const balance = Number((totalAmount - amountPaid - discount).toFixed(2));
  const isFinalized = !!payment.finalizedAt;
  const isPaid = payment.status === 'PAID';

  return {
    id: payment.id,
    appointmentId: payment.appointmentId,
    patientId: payment.patientId,
    patientName: payment.patient ? `${payment.patient.firstName} ${payment.patient.lastName}` : 'Unknown Patient',
    doctorName: appointment?.doctorName,
    billDate: payment.billDate ? new Date(payment.billDate).toISOString() : new Date().toISOString(),
    paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : undefined,
    status: payment.status,
    totalAmount,
    amountPaid,
    discount,
    balance: Math.max(0, balance),
    paymentMethod: payment.paymentMethod,
    receiptNumber: payment.receiptNumber,
    chargeSheetNo: payment.chargeSheetNo,
    finalizedAt: payment.finalizedAt ? new Date(payment.finalizedAt).toISOString() : undefined,
    finalizedBy: payment.finalizedBy,
    billItems: (payment.billItems || []).map((item: any) => ({
      id: item.id,
      serviceId: item.serviceId,
      inventoryItemId: item.inventoryItemId,
      serviceName: item.serviceName || 'Unknown Service',
      quantity: Number(item.quantity || 1),
      unitCost: Number(item.unitCost || 0),
      totalCost: Number(item.totalCost || 0),
      isInventory: !!item.inventoryItemId,
    })),
    canEdit: !isPaid,
  };
}
