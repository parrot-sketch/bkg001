import { PrismaClient, InventoryCategory as PrismaCategory, StockMovementType as PrismaMovementType } from '@prisma/client';
import { 
  IInventoryRepository, 
  InventoryItem, 
  InventoryTransaction, 
  InventorySummary, 
  CreateInventoryItemDto, 
  RecordTransactionDto,
  StockMovementType
} from '../../../domain/interfaces/repositories/IInventoryRepository';
import { InventoryCategory } from '../../../domain/enums/InventoryCategory';

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
    const items = await this.prisma.inventoryItem.findMany({
      where: { is_active: true },
    });

    const lowStockItems: Awaited<ReturnType<typeof this.mapToInventoryItem>>[] = [];

    for (const item of items) {
      const balance = await this.getItemBalance(item.id);
      if (balance <= item.reorder_point) {
        lowStockItems.push(this.mapToInventoryItem(item));
      }
    }

    return lowStockItems;
  }

  async createItem(dto: CreateInventoryItemDto): Promise<InventoryItem> {
    // 1. Create the item first to get the auto-increment ID
    const initialItem = await this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
        sku: dto.sku || 'PENDING', // Temporary SKU
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

    // 2. If no SKU provided, generate one based on ID
    if (!dto.sku) {
      const CATEGORY_PREFIXES: Record<string, string> = {
        IMPLANT: 'IMP',
        SUTURE: 'SUT',
        ANESTHETIC: 'ANS',
        MEDICATION: 'MED',
        DISPOSABLE: 'DSP',
        INSTRUMENT: 'INS',
        DRESSING: 'DRS',
        OTHER: 'OTH',
      };
      
      const prefix = CATEGORY_PREFIXES[initialItem.category as string] || 'GEN';
      const paddedId = initialItem.id.toString().padStart(5, '0');
      const generatedSku = `${prefix}-${paddedId}`;

      const updatedItem = await this.prisma.inventoryItem.update({
        where: { id: initialItem.id },
        data: { sku: generatedSku }
      });
      return this.mapToInventoryItem(updatedItem);
    }

    return this.mapToInventoryItem(initialItem);
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

    // 2. Aggregate transactions for each item
    // Note: In production, this would be a single complex SQL query or a cached view.
    // For Nairobi Sculpt, we'll derive it by summing transactions per product.
    
    const summaries: InventorySummary[] = await Promise.all(
      items.map(async (item) => {
        const transactions = await this.prisma.inventoryTransaction.findMany({
          where: { inventory_item_id: item.id },
        });

        let totalIn = 0;
        let totalOut = 0;
        let lastMovement: Date | null = null;

        transactions.forEach((t) => {
          if (t.type === 'STOCK_IN' || t.type === 'OPENING_BALANCE' || (t.type === 'ADJUSTMENT' && t.quantity > 0)) {
            totalIn += Math.abs(t.quantity);
          } else if (t.type === 'STOCK_OUT' || (t.type === 'ADJUSTMENT' && t.quantity < 0)) {
            totalOut += Math.abs(t.quantity);
          }
          
          if (!lastMovement || t.created_at > lastMovement) {
            lastMovement = t.created_at;
          }
        });

        const currentBalance = totalIn - totalOut;
        
        let status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OK';
        if (currentBalance <= 0) {
          status = 'OUT_OF_STOCK';
        } else if (currentBalance <= (item.low_stock_threshold || item.reorder_point)) {
          status = 'LOW_STOCK';
        }

        return {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category as unknown as InventoryCategory,
          currentBalance,
          totalStockIn: totalIn,
          totalStockOut: totalOut,
          unitCost: item.unit_cost,
          totalValue: currentBalance * item.unit_cost,
          lastMovement,
          status,
        };
      })
    );

    return summaries;
  }

  async getItemBalance(itemId: number): Promise<number> {
    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: { inventory_item_id: itemId },
    });

    let totalIn = 0;
    let totalOut = 0;

    transactions.forEach((t) => {
      if (t.type === 'STOCK_IN' || t.type === 'OPENING_BALANCE' || (t.type === 'ADJUSTMENT' && t.quantity > 0)) {
        totalIn += Math.abs(t.quantity);
      } else if (t.type === 'STOCK_OUT' || (t.type === 'ADJUSTMENT' && t.quantity < 0)) {
        totalOut += Math.abs(t.quantity);
      }
    });

    return totalIn - totalOut;
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

  async recordUsage(dto: {
    inventoryItemId: number;
    surgicalCaseId?: string;
    appointmentId?: number;
    quantityUsed: number;
    recordedBy: string;
    notes?: string;
  }): Promise<unknown> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
    });

    if (!item) {
      throw new Error('Inventory item not found');
    }

    if (!item.is_active) {
      throw new Error('Inventory item is inactive');
    }

    const usage = await this.prisma.inventoryUsage.create({
      data: {
        inventory_item_id: dto.inventoryItemId,
        surgical_case_id: dto.surgicalCaseId,
        appointment_id: dto.appointmentId,
        quantity_used: dto.quantityUsed,
        unit_cost_at_time: item.unit_cost,
        total_cost: dto.quantityUsed * item.unit_cost,
        recorded_by: dto.recordedBy,
        notes: dto.notes,
      },
    });

    return usage;
  }
}
