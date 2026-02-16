import { InventoryCategory } from '../../enums/InventoryCategory';

/**
 * Inventory Item Entity
 * 
 * Represents a physical item in the clinic's inventory.
 * Items can be billable (charged to patient) or non-billable (overhead).
 */
export interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  description: string | null;
  unitOfMeasure: string;
  unitCost: number;
  quantityOnHand: number;
  reorderPoint: number;
  supplier: string | null;
  manufacturer: string | null;
  isActive: boolean;
  isBillable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory Usage Record
 * 
 * Tracks consumption of inventory items during procedures or appointments.
 * Links to billing when the item is charged to the patient.
 */
export interface InventoryUsage {
  id: number;
  inventoryItemId: number;
  surgicalCaseId: string | null;
  appointmentId: number | null;
  quantityUsed: number;
  unitCostAtTime: number;
  totalCost: number;
  recordedBy: string;
  notes: string | null;
  billItemId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory usage with related item details for display
 */
export interface InventoryUsageWithItem extends InventoryUsage {
  item: {
    name: string;
    category: InventoryCategory;
    unitOfMeasure: string;
    isBillable: boolean;
  };
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
  quantityOnHand?: number;
  reorderPoint?: number;
  supplier?: string;
  manufacturer?: string;
  isBillable?: boolean;
}

/**
 * DTO for recording inventory usage
 */
export interface RecordInventoryUsageDto {
  inventoryItemId: number;
  surgicalCaseId?: string;
  appointmentId?: number;
  quantityUsed: number;
  recordedBy: string;
  notes?: string;
}

/**
 * Repository Interface: IInventoryRepository
 * 
 * Manages inventory items and usage tracking.
 * Follows clean architecture — no infrastructure dependencies.
 * 
 * Business Rules:
 * - Inventory items have unique SKUs (when set)
 * - Usage records snapshot unit cost at time of use (immutable pricing)
 * - Stock is decremented when usage is recorded
 * - Low stock alerts are triggered when quantity falls below reorder point
 */
export interface IInventoryRepository {
  // ============================================================================
  // INVENTORY ITEMS
  // ============================================================================

  /** Find item by ID */
  findItemById(id: number): Promise<InventoryItem | null>;

  /** Find all active items, optionally filtered by category */
  findActiveItems(category?: InventoryCategory): Promise<InventoryItem[]>;

  /** Find items below reorder point (low stock) */
  findLowStockItems(): Promise<InventoryItem[]>;

  /** Create a new inventory item */
  createItem(dto: CreateInventoryItemDto): Promise<InventoryItem>;

  /** Update an inventory item */
  updateItem(id: number, data: Partial<CreateInventoryItemDto>): Promise<InventoryItem>;

  /** Adjust stock quantity (restock) */
  adjustStock(itemId: number, quantityChange: number): Promise<InventoryItem>;

  // ============================================================================
  // INVENTORY USAGE
  // ============================================================================

  /** Record usage of an inventory item during a procedure */
  recordUsage(dto: RecordInventoryUsageDto): Promise<InventoryUsage>;

  /** Get all usage records for a surgical case */
  findUsageBySurgicalCase(surgicalCaseId: string): Promise<InventoryUsageWithItem[]>;

  /** Get all usage records for an appointment */
  findUsageByAppointment(appointmentId: number): Promise<InventoryUsageWithItem[]>;

  /** Link usage to a bill item (after billing) */
  linkUsageToBillItem(usageId: number, billItemId: number): Promise<InventoryUsage>;
}
