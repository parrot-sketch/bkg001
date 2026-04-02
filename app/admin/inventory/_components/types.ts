export interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  is_implant: boolean;
}

export interface InventoryBatch {
  id: string;
  batch_number: string;
  serial_number: string | null;
  expiry_date: Date;
  quantity_remaining: number;
  cost_per_unit: number;
  inventory_item: { name: string; sku: string | null; category: string };
}

export interface InventorySummary {
  itemId: number;
  name: string;
  sku: string | null;
  category: string;
  currentBalance: number;
  totalStockIn: number;
  totalStockOut: number;
  unitCost: number;
  totalValue: number;
  lastMovement: Date | null;
  status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
