import { PrismaClient, InventoryCategory as PrismaCategory, StockMovementType as PrismaMovementType } from '@prisma/client';
import { 
  IInventoryRepository, 
  InventoryItem, 
  InventoryTransaction, 
  InventorySummary, 
  CreateInventoryItemDto, 
  RecordTransactionDto,
  StockMovementType,
  PaginatedInventoryItems,
  PaginationMeta
} from '../../../domain/interfaces/repositories/IInventoryRepository';
import { InventoryCategory } from '../../../domain/enums/InventoryCategory';
import { InsufficientBatchQuantityError } from '../../../application/errors';

export class PrismaInventoryRepository implements IInventoryRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // MAPPERS
  // ============================================================================

  private mapToInventoryItem(item: any): InventoryItem {
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category as unknown as InventoryCategory,
      description: item.description,
      unitOfMeasure: item.unit_of_measure,
      unitCost: item.unit_cost,
      reorderPoint: item.reorder_point,
      lowStockThreshold: item.low_stock_threshold,
      supplier: item.supplier,
      manufacturer: item.manufacturer,
      isActive: item.is_active,
      isBillable: item.is_billable,
      isImplant: item.is_implant,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }

  private mapToTransaction(t: any): InventoryTransaction {
    return {
      id: t.id,
      inventoryItemId: t.inventory_item_id,
      type: t.type as unknown as StockMovementType,
      quantity: t.quantity,
      unitPrice: t.unit_price,
      totalValue: t.total_value,
      reference: t.reference,
      notes: t.notes,
      createdById: t.created_by_user_id,
      createdAt: t.created_at,
    };
  }

  // ============================================================================
  // INVENTORY ITEMS
  // ============================================================================

  async findItemById(id: number): Promise<InventoryItem | null> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });
    return item ? this.mapToInventoryItem(item) : null;
  }

  async findActiveItems(category?: InventoryCategory): Promise<InventoryItem[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        is_active: true,
        ...(category ? { category: category as unknown as PrismaCategory } : {}),
      },
      orderBy: { name: 'asc' },
    });
    return items.map(this.mapToInventoryItem);
  }

  async findLowStockItems(): Promise<InventoryItem[]> {
    // Query 1: Get all active items
    const items = await this.prisma.inventoryItem.findMany({
      where: { is_active: true },
    });

    if (items.length === 0) {
      return [];
    }

    // Query 2: Batch load all transactions for these items
    const itemIds = items.map((item) => item.id);
    const balances = await this.calculateBalances(itemIds);

    // Filter items where balance <= reorder_point
    return items
      .filter((item) => {
        const balance = balances.get(item.id) ?? 0;
        return balance <= item.reorder_point;
      })
      .map(this.mapToInventoryItem);
  }

  /**
   * Search and paginate inventory items with database-level filtering.
   * Uses Prisma's case-insensitive search and skip/take for pagination.
   * 
   * @param options Search, category filter, page, and limit
   * @returns Paginated items with metadata
   */
  async searchAndPaginateItems(options: {
    search?: string;
    category?: InventoryCategory;
    page: number;
    limit: number;
  }): Promise<PaginatedInventoryItems> {
    // Build where clause
    const whereClause: any = {
      is_active: true,
    };

    // Add search filter if provided and non-empty
    if (options.search && options.search.trim()) {
      whereClause.OR = [
        {
          name: {
            contains: options.search.trim(),
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: options.search.trim(),
            mode: 'insensitive',
          },
        },
      ];
    }

    // Add category filter if provided
    if (options.category) {
      whereClause.category = options.category as unknown as PrismaCategory;
    }

    // Calculate pagination
    const skip = (options.page - 1) * options.limit;
    const take = options.limit;

    // Execute queries in parallel for efficiency
    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.inventoryItem.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / options.limit);

    return {
      items: items.map(this.mapToInventoryItem),
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages,
      },
    };
  }

  /**
   * Calculates balances for multiple items in a single batch query.
   * This eliminates N+1 queries by loading all transactions at once.
   * 
   * @param itemIds Array of inventory item IDs
   * @returns Map<itemId, balance> where balance = totalIn - totalOut
   */
  private async calculateBalances(itemIds: number[]): Promise<Map<number, number>> {
    if (itemIds.length === 0) {
      return new Map();
    }

    // Single batch query for all transactions
    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: { inventory_item_id: { in: itemIds } },
    });

    // Calculate balance for each item using in-memory computation
    const balances = new Map<number, number>();

    // Initialize all items with 0 balance
    itemIds.forEach((itemId) => balances.set(itemId, 0));

    // Aggregate transactions by item
    transactions.forEach((t) => {
      const currentBalance = balances.get(t.inventory_item_id) ?? 0;

      if (t.type === 'STOCK_IN' || t.type === 'OPENING_BALANCE' || (t.type === 'ADJUSTMENT' && t.quantity > 0)) {
        balances.set(t.inventory_item_id, currentBalance + Math.abs(t.quantity));
      } else if (t.type === 'STOCK_OUT' || (t.type === 'ADJUSTMENT' && t.quantity < 0)) {
        balances.set(t.inventory_item_id, currentBalance - Math.abs(t.quantity));
      }
    });

    return balances;
  }

  /**
   * Generates a unique SKU for an inventory item.
   * Format: {CATEGORY_PREFIX}-{TIMESTAMP_BASE36}-{RANDOM_SUFFIX}
   * Example: SURG-LX4K-A3F2
   * 
   * This method does NOT depend on the database ID, ensuring uniqueness
   * can be verified before insertion (no race condition).
   * 
   * @param category Inventory item category
   * @returns Generated SKU in format ABCD-EFGH-IJKL
   */
  private generateSku(category: InventoryCategory): string {
    const CATEGORY_PREFIXES: Record<InventoryCategory, string> = {
      IMPLANT: 'IMP',
      SUTURE: 'SUT',
      ANESTHETIC: 'ANS',
      MEDICATION: 'MED',
      DISPOSABLE: 'DSP',
      INSTRUMENT: 'INS',
      DRESSING: 'DRS',
      SPECIMEN_CONTAINER: 'SPC',
      OTHER: 'OTH',
    };

    const prefix = CATEGORY_PREFIXES[category] || 'GEN';

    // Timestamp in base-36 (more compact than base-10)
    const timestamp = Date.now().toString(36).toUpperCase();
    const timestampSuffix = timestamp.slice(-4); // Last 4 chars of timestamp

    // Random 4-character alphanumeric suffix
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomSuffix = '';
    for (let i = 0; i < 4; i++) {
      randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${timestampSuffix}-${randomSuffix}`;
  }

  async createItem(dto: CreateInventoryItemDto): Promise<InventoryItem> {
    // Generate SKU before transaction (prevents second round-trip)
    const sku = dto.sku || this.generateSku(dto.category as unknown as InventoryCategory);

    // Wrap entire create operation in a transaction for atomicity
    const item = await this.prisma.$transaction(async (tx) => {
      // Single atomic create with final SKU
      const createdItem = await tx.inventoryItem.create({
        data: {
          name: dto.name,
          sku, // Final SKU, not PENDING
          category: dto.category as unknown as PrismaCategory,
          description: dto.description,
          unit_of_measure: dto.unitOfMeasure,
          unit_cost: dto.unitCost,
          reorder_point: dto.reorderPoint,
          low_stock_threshold: dto.lowStockThreshold,
          supplier: dto.supplier,
          manufacturer: dto.manufacturer,
          is_billable: dto.isBillable,
          is_implant: dto.isImplant,
        },
      });

      return createdItem;
    });

    return this.mapToInventoryItem(item);
  }

  async updateItem(id: number, data: Partial<CreateInventoryItemDto>): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category as unknown as PrismaCategory,
        description: data.description,
        unit_of_measure: data.unitOfMeasure,
        unit_cost: data.unitCost,
        reorder_point: data.reorderPoint,
        low_stock_threshold: data.lowStockThreshold,
        supplier: data.supplier,
        manufacturer: data.manufacturer,
        is_billable: data.isBillable,
        is_implant: data.isImplant,
      },
    });
    return this.mapToInventoryItem(item);
  }

  // ============================================================================
  // TRANSACTIONS & BALANCES
  // ============================================================================

  async recordTransaction(dto: RecordTransactionDto): Promise<InventoryTransaction> {
    const totalValue = dto.quantity * (dto.unitPrice || 0);
    
    const transaction = await this.prisma.inventoryTransaction.create({
      data: {
        inventory_item_id: dto.inventoryItemId,
        type: dto.type as unknown as PrismaMovementType,
        quantity: dto.quantity,
        unit_price: dto.unitPrice || 0,
        total_value: totalValue,
        reference: dto.reference,
        notes: dto.notes,
        created_by_user_id: dto.createdById,
      },
    });

    return this.mapToTransaction(transaction);
  }

  async findTransactionsByItem(itemId: number): Promise<InventoryTransaction[]> {
    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: { inventory_item_id: itemId },
      orderBy: { created_at: 'desc' },
    });
    return transactions.map(this.mapToTransaction);
  }

  async getInventorySummary(): Promise<InventorySummary[]> {
    // 1. Get all active items
    const items = await this.prisma.inventoryItem.findMany({
      where: { is_active: true },
    });

    if (items.length === 0) {
      return [];
    }

    // 2. Batch load all transactions for these items (eliminates N+1)
    const itemIds = items.map((item) => item.id);
    const balances = await this.calculateBalances(itemIds);

    // 3. Get all transactions to calculate lastMovement per item
    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: { inventory_item_id: { in: itemIds } },
      orderBy: { created_at: 'desc' },
    });

    // Build a map of item ID to last movement date
    const lastMovementMap = new Map<number, Date>();
    transactions.forEach((t) => {
      if (!lastMovementMap.has(t.inventory_item_id)) {
        lastMovementMap.set(t.inventory_item_id, t.created_at);
      }
    });

     // 4. Build summaries with calculated balances
    const summaries: InventorySummary[] = items.map((item) => {
      const currentBalance = balances.get(item.id) ?? 0;
      const unitCostNum = typeof item.unit_cost === 'number' 
        ? item.unit_cost 
        : item.unit_cost.toNumber();

      let status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OK';
      if (currentBalance <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (currentBalance <= (item.low_stock_threshold || item.reorder_point)) {
        status = 'LOW_STOCK';
      }

      // Calculate totals from transactions (only for this item)
      const itemTransactions = transactions.filter((t) => t.inventory_item_id === item.id);
      let totalIn = 0;
      let totalOut = 0;

      itemTransactions.forEach((t) => {
        if (t.type === 'STOCK_IN' || t.type === 'OPENING_BALANCE' || (t.type === 'ADJUSTMENT' && t.quantity > 0)) {
          totalIn += Math.abs(t.quantity);
        } else if (t.type === 'STOCK_OUT' || (t.type === 'ADJUSTMENT' && t.quantity < 0)) {
          totalOut += Math.abs(t.quantity);
        }
      });

      return {
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category as unknown as InventoryCategory,
        currentBalance,
        totalStockIn: totalIn,
        totalStockOut: totalOut,
        unitCost: unitCostNum,
        totalValue: currentBalance * unitCostNum,
        lastMovement: lastMovementMap.get(item.id) ?? null,
        status,
      };
    });

    return summaries;
  }

  async getItemBalance(itemId: number): Promise<number> {
    const balances = await this.calculateBalances([itemId]);
    return balances.get(itemId) ?? 0;
  }

  // ============================================================================
  // USAGE RECORDS
  // ============================================================================

  async findUsageBySurgicalCase(surgicalCaseId: string): Promise<{ totalCost: number; item: { isBillable: boolean } }[]> {
    const usageRecords = await this.prisma.inventoryUsage.findMany({
      where: { surgical_case_id: surgicalCaseId },
      include: {
        inventory_item: {
          select: { is_billable: true },
        },
      },
    });

    return usageRecords.map((u) => ({
      totalCost: u.total_cost,
      item: { isBillable: u.inventory_item.is_billable },
    }));
  }

  async findUsageByAppointment(appointmentId: number): Promise<{ totalCost: number; item: { isBillable: boolean } }[]> {
    const usageRecords = await this.prisma.inventoryUsage.findMany({
      where: { appointment_id: appointmentId },
      include: {
        inventory_item: {
          select: { is_billable: true },
        },
      },
    });

    return usageRecords.map((u) => ({
      totalCost: u.total_cost,
      item: { isBillable: u.inventory_item.is_billable },
    }));
  }

  /**
   * Record inventory usage with optional batch specification and FIFO fallback.
   * 
   * If batchId is provided:
   * - Validates that the batch has sufficient quantity_remaining
   * - Decrements quantity_remaining atomically
   * - Throws InsufficientBatchQuantityError if insufficient
   * 
   * If no batchId (legacy):
   * - Uses FIFO strategy: fetches batches ordered by expiry_date ASC
   * - Deducts from batches in order until usage quantity is satisfied
   * - All deductions happen within a single transaction
   * 
   * Emits InventoryAuditEvent after successful recording.
   */
  async recordUsage(dto: {
    inventoryItemId: number;
    surgicalCaseId?: string;
    appointmentId?: number;
    quantityUsed: number;
    recordedBy: string;
    notes?: string;
    batchId?: string; // Optional: if provided, use specific batch; otherwise FIFO
  }): Promise<unknown> {
    // Step 1: Validate item exists and is active
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
    });

    if (!item) {
      throw new Error('Inventory item not found');
    }

    if (!item.is_active) {
      throw new Error('Inventory item is inactive');
    }

    const unitCostNumber = typeof item.unit_cost === 'number' 
      ? item.unit_cost 
      : item.unit_cost.toNumber();

    // Step 2: Atomically record usage and decrement batch quantities
    const usage = await this.prisma.$transaction(async (tx) => {
      if (dto.batchId) {
        // Explicit batch specified - validate and decrement specific batch
        await this.deductFromSpecificBatch(tx, dto.batchId, dto.quantityUsed);
      } else {
        // FIFO batch selection - deduct from batches in expiry order
        await this.deductFromBatchesFIFO(tx, dto.inventoryItemId, dto.quantityUsed);
      }

      // Create the InventoryUsage record
      const usageRecord = await tx.inventoryUsage.create({
        data: {
          inventory_item_id: dto.inventoryItemId,
          surgical_case_id: dto.surgicalCaseId,
          appointment_id: dto.appointmentId,
          quantity_used: dto.quantityUsed,
          unit_cost_at_time: unitCostNumber,
          total_cost: dto.quantityUsed * unitCostNumber,
          recorded_by: dto.recordedBy,
          notes: dto.notes,
        },
      });

      // Step 3: Emit InventoryAuditEvent for audit trail
      await tx.inventoryAuditEvent.create({
        data: {
          event_type: 'INVENTORY_USAGE_RECORDED',
          actor_user_id: dto.recordedBy,
          actor_role: 'NURSE', // Could be parameterized in future
          entity_type: 'InventoryUsage',
          entity_id: usageRecord.id.toString(),
          metadata_json: JSON.stringify({
            inventoryItemId: dto.inventoryItemId,
            quantityUsed: dto.quantityUsed,
            surgicalCaseId: dto.surgicalCaseId,
            appointmentId: dto.appointmentId,
            batchId: dto.batchId,
          }),
        },
      });

      return usageRecord;
    });

    return usage;
  }

  /**
   * Deduct from a specific batch, validating sufficient quantity.
   * Throws InsufficientBatchQuantityError if quantity_remaining < quantityUsed.
   * 
   * @private
   */
  private async deductFromSpecificBatch(
    tx: any, // Prisma transaction client
    batchId: string,
    quantityUsed: number
  ): Promise<void> {
    const batch = await tx.inventoryBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    if (batch.quantity_remaining < quantityUsed) {
      throw new InsufficientBatchQuantityError(
        batchId,
        quantityUsed,
        batch.quantity_remaining
      );
    }

    // Decrement quantity_remaining (database constraint ensures non-negative)
    await tx.inventoryBatch.update({
      where: { id: batchId },
      data: {
        quantity_remaining: { decrement: quantityUsed },
      },
    });
  }

  /**
   * FIFO batch selection: deduct from batches ordered by expiry_date ASC.
   * Deducts from multiple batches if necessary until quantityUsed is satisfied.
   * All deductions happen within the same transaction for atomicity.
   * 
   * Throws InsufficientBatchQuantityError if total available < quantityUsed.
   * 
   * @private
   */
  private async deductFromBatchesFIFO(
    tx: any, // Prisma transaction client
    inventoryItemId: number,
    quantityUsed: number
  ): Promise<void> {
    // Fetch batches ordered by expiry_date ASC (FIFO), excluding depleted batches
    const batches = await tx.inventoryBatch.findMany({
      where: {
        inventory_item_id: inventoryItemId,
        quantity_remaining: { gt: 0 },
      },
      orderBy: { expiry_date: 'asc' },
    });

    if (batches.length === 0) {
      throw new InsufficientBatchQuantityError(
        'FIFO_NO_BATCHES',
        quantityUsed,
        0,
        `No available batches for item ${inventoryItemId}`
      );
    }

    // Calculate total available quantity
    const totalAvailable = batches.reduce((sum: number, b: any) => sum + b.quantity_remaining, 0);
    if (totalAvailable < quantityUsed) {
      throw new InsufficientBatchQuantityError(
        'FIFO_INSUFFICIENT_TOTAL',
        quantityUsed,
        totalAvailable,
        `Insufficient total quantity across all batches for item ${inventoryItemId}`
      );
    }

    // Deduct from batches in FIFO order
    let remainingToDeduct = quantityUsed;
    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const deductAmount = Math.min(batch.quantity_remaining, remainingToDeduct);
      
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          quantity_remaining: { decrement: deductAmount },
        },
      });

      remainingToDeduct -= deductAmount;
    }
  }
}
