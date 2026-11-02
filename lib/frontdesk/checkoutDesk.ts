export interface DeskBill {
  id: number;
  patientId: string;
  appointmentId: number | null;
  billDate: string;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  status: string;
  receiptNumber: string | null;
  chargeSheetNo?: string | null;
  paymentMethod?: string | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    fileNumber?: string;
  };
  billItems?: Array<{
    id: number;
    serviceName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}

export interface CheckoutDeskData {
  ready: DeskBill[];
  drafts: DeskBill[];
  recorded: DeskBill[];
  summary: {
    balanceDue: number;
    readyCount: number;
    draftCount: number;
    recordedCount: number;
  };
}

export function billBalance(bill: Pick<DeskBill, 'totalAmount' | 'discount' | 'amountPaid'>): number {
  return Math.max(0, (bill.totalAmount || 0) - (bill.discount || 0) - (bill.amountPaid || 0));
}

export function kes(amount: number): string {
  return `KES ${Math.max(0, amount).toLocaleString('en-KE')}`;
}

export function billMatchesQuery(bill: DeskBill, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const name = `${bill.patient?.firstName ?? ''} ${bill.patient?.lastName ?? ''}`.toLowerCase();
  const file = bill.patient?.fileNumber?.toLowerCase() ?? '';
  const sheet = bill.chargeSheetNo?.toLowerCase() ?? '';
  const receipt = bill.receiptNumber?.toLowerCase() ?? '';
  return name.includes(needle) || file.includes(needle) || sheet.includes(needle) || receipt.includes(needle);
}
