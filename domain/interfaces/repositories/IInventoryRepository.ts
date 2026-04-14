import { InventoryCategory } from '../../enums/InventoryCategory';

/**
 * Stock Movement Types
 */
export enum StockMovementType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  OPENING_BALANCE = 'OPENING_BALANCE'
}

/**
 * Inventory Item Entity
 * 
 * Represents a physical item in the clinic's inventory.
 * Balances are DERIVED from transactions.
 */
export interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  description: string | null;
  unitOfMeasure: string;
  unitCost: number;
  reorderPoint: number;
  lowStockThreshold: number;
  supplier: string | null;
  manufacturer: string | null;
  isActive: boolean;
  isBillable: boolean;
  isImplant: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response for search results
 */
export interface PaginatedInventoryItems {
  items: InventoryItem[];
  pagination: PaginationMeta;
}

/**
 * Inventory Transaction Entity
 * 
 * Records a single movement of stock.
 */
export interface InventoryTransaction {
  id: string;
  inventoryItemId: number;
  type: StockMovementType;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reference: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: Date;
}

/**
 * Aggregated Inventory Summary
 */
export interface InventorySummary {
  itemId: number;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  currentBalance: number;
  totalStockIn: number;
  totalStockOut: number;
  unitCost: number;
  totalValue: number;
  lastMovement: Date | null;
  status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

/**
 * DTO for creating an inventory item
 */
export interface CreateInventoryItemDto {
  name: string;
  sku?: string;
  category?: InventoryCategory;
  description?: string;
  unitOfMeasure?: string;
  unitCost: number;
  reorderPoint?: number;
  lowStockThreshold?: number;
  supplier?: string;
  manufacturer?: string;
  isBillable?: boolean;
  isImplant?: boolean;
}

/**
 * DTO for recording a stock movement
 */
export interface RecordTransactionDto {
  inventoryItemId: number;
  type: StockMovementType;
  quantity: number;
  unitPrice?: number;
  reference?: string;
  notes?: string;
  createdById?: string;
}

/**
 * Repository Interface: IInventoryRepository
 * 
 * Manages inventory items and transaction-based tracking.
 */
export interface IInventoryRepository {
  // ============================================================================
  // INVENTORY ITEMS
  // ============================================================================

  /** Find item by ID */
  findItemById(id: number): Promise<InventoryItem | null>;

  /** Find all active items */
  findActiveItems(category?: InventoryCategory): Promise<InventoryItem[]>;

  /** Find items where current balance is at or below reorder point */
  findLowStockItems(): Promise<InventoryItem[]>;

  /** Search and paginate inventory items with optional filtering */
  searchAndPaginateItems(options: {
    search?: string;
    category?: InventoryCategory;
    page: number;
    limit: number;
    isBillable?: boolean;
  }): Promise<PaginatedInventoryItems>;

  /** Create a new inventory item */
  createItem(dto: CreateInventoryItemDto): Promise<InventoryItem>;

  /** Update an inventory item */
  updateItem(id: number, data: Partial<CreateInventoryItemDto>): Promise<InventoryItem>;

  // ============================================================================
  // TRANSACTIONS & BALANCES
  // ============================================================================

  /** Record a stock movement transaction */
  recordTransaction(dto: RecordTransactionDto): Promise<InventoryTransaction>;

  /** Get transaction history for an item */
  findTransactionsByItem(itemId: number): Promise<InventoryTransaction[]>;

  /** Get aggregated summary for all items */
  getInventorySummary(): Promise<InventorySummary[]>;

  /** Get current balance for a specific item */
  getItemBalance(itemId: number): Promise<number>;

  /** Get current balances for multiple items in bulk (solves N+1) */
  getBalances(itemIds: number[]): Promise<Map<number, number>>;

  // ============================================================================
  // USAGE RECORDS
  // ============================================================================

  /** Find usage records by surgical case ID */
  findUsageBySurgicalCase(surgicalCaseId: string): Promise<{ totalCost: number; item: { isBillable: boolean } }[]>;

  /** Find usage records by appointment ID */
  findUsageByAppointment(appointmentId: number): Promise<{ totalCost: number; item: { isBillable: boolean } }[]>;

  /** Record inventory usage */
  recordUsage(dto: {
    inventoryItemId: number;
    surgicalCaseId?: string;
    appointmentId?: number;
    quantityUsed: number;
    recordedBy: string;
    notes?: string;
  }): Promise<unknown>;
}
