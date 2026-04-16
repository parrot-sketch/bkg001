/**
 * Shared types for the Charge Sheet feature.
 *
 * Used by TheaterTechBilling, ChargeSheetStep, and all charge-sheet
 * sub-components so type definitions live in exactly one place.
 */

// ── Domain Entities ─────────────────────────────────────────────────────────

export interface Service {
  id: number;
  service_name: string;
  description?: string | null;
  price: number;
  category: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_cost: number;
  category?: string;
}

export interface ChargeItem {
  id: string;
  description: string;
  /** Unit price — stored as a real number; editing uses RowDraft.amountStr. */
  amount: number;
  /** Optional reference price from the service or inventory catalog. */
  catalogAmount?: number;
  /** Quantity — stored as a real number; editing uses RowDraft.quantityStr. */
  quantity: number;
  type: 'service' | 'inventory';
  itemId: number | string;
}

/**
 * Per-row edit state stored separately so the user can freely clear and
 * retype both the quantity and unit-price fields without the app forcing
 * in a fallback value mid-keystroke.
 */
export interface RowDraft {
  quantityStr: string;
  amountStr: string;
}

// ── Sub-Component Props ─────────────────────────────────────────────────────

export interface ChargeSearchInputProps {
  searchQuery: string;
  dropdownOpen: boolean;
  filteredServices: Service[];
  filteredInventory: Service[] | InventoryItem[];
  onSearchChange: (value: string) => void;
  onFocus: () => void;
  onAddService: (service: Service) => void;
  onAddInventory: (item: InventoryItem) => void;
  onClose: () => void;
}

export interface ChargeItemsTableProps {
  chargeItems: ChargeItem[];
  rowDrafts: Record<string, RowDraft>;
  onQuantityChange: (id: string, value: string) => void;
  onQuantityBlur: (id: string) => void;
  onAmountChange: (id: string, value: string) => void;
  onAmountBlur: (id: string) => void;
  onRemoveItem: (id: string) => void;
  getDraft: (item: ChargeItem) => RowDraft;
}

export interface ChargeTotalsProps {
  subtotal: number;
  discount: number;
  total: number;
  discountStr: string;
  onDiscountChange: (value: string) => void;
  onDiscountBlur: () => void;
}
