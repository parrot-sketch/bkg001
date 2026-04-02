export interface PurchaseOrder {
  id: string;
  po_number: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'CLOSED' | 'CANCELLED';
  total_amount: number;
  vendor: { id: string; name: string };
  items: { id: number; item_name: string; quantity_ordered: number }[];
  created_at: string;
}
