import { PrismaClient } from '@prisma/client';
import {
  IInventoryRepository,
  InventoryItem,
  InventoryUsage,
  InventoryUsageWithItem,
  CreateInventoryItemDto,
  RecordInventoryUsageDto,
} from '../../../domain/interfaces/repositories/IInventoryRepository';
import { InventoryCategory } from '../../../domain/enums/InventoryCategory';

/**
 * Prisma Implementation: PrismaInventoryRepository
 * 
 * Manages inventory items and usage tracking in the database.
 * 
 * Key behaviors:
 * - Stock is decremented atomically when usage is recorded
 * - Unit cost is snapshotted at time of use (immutable pricing)
 * - Low stock alerts based on reorder point
 */
export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaClient) { }

  // ============================================================================
  // MAPPERS
  // ============================================================================

  private mapToItem(data: any): InventoryItem {
    return {
      id: data.id,
      name: data.name,
      sku: data.sku ?? null,
      category: data.category as InventoryCategory,
      description: data.description ?? null,
      unitOfMeasure: data.unit_of_measure,
      unitCost: data.unit_cost,
      quantityOnHand: data.quantity_on_hand,
      reorderPoint: data.reorder_point,
      supplier: data.supplier ?? null,
      manufacturer: data.manufacturer ?? null,
      isActive: data.is_active,
      isBillable: data.is_billable,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToUsage(data: any): InventoryUsage {
    return {
      id: data.id,
      inventoryItemId: data.inventory_item_id,
      surgicalCaseId: data.surgical_case_id ?? null,
      appointmentId: data.appointment_id ?? null,
      quantityUsed: data.quantity_used,
      unitCostAtTime: data.unit_cost_at_time,
      totalCost: data.total_cost,
      recordedBy: data.recorded_by,
      notes: data.notes ?? null,
      billItemId: data.bill_item_id ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToUsageWithItem(data: any): InventoryUsageWithItem {
    return {
      ...this.mapToUsage(data),
      item: {
        name: data.inventory_item?.name || 'Unknown Item',
        category: data.inventory_item?.category as InventoryCategory,
        unitOfMeasure: data.inventory_item?.unit_of_measure || 'unit',
        isBillable: data.inventory_item?.is_billable ?? true,
      },
    };
  }

  // ============================================================================
  // INVENTORY ITEMS
  // ============================================================================

  async findItemById(id: number): Promise<InventoryItem | null> {
    const result = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });
    return result ? this.mapToItem(result) : null;
  }

  async findActiveItems(category?: InventoryCategory): Promise<InventoryItem[]> {
    const results = await this.prisma.inventoryItem.findMany({
      where: {
        is_active: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return results.map(this.mapToItem.bind(this));
  }

  async findLowStockItems(): Promise<InventoryItem[]> {
    const results = await this.prisma.inventoryItem.findMany({
      where: {
        is_active: true,
        // Raw comparison: quantity_on_hand <= reorder_point
        // Prisma doesn't support field-to-field comparison directly,
        // so we use raw SQL via $queryRaw
      },
      orderBy: { quantity_on_hand: 'asc' },
    });

    // Filter in application layer (Prisma limitation for field-to-field comparison)
    return results
      .filter(r => r.quantity_on_hand <= r.reorder_point)
      .map(this.mapToItem.bind(this));
  }

  async createItem(dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const result = await this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
        sku: dto.sku ?? null,
        category: dto.category ?? 'OTHER',
        description: dto.description ?? null,
        unit_of_measure: dto.unitOfMeasure ?? 'unit',
        unit_cost: dto.unitCost,
        quantity_on_hand: dto.quantityOnHand ?? 0,
        reorder_point: dto.reorderPoint ?? 0,
        supplier: dto.supplier ?? null,
        is_billable: dto.isBillable ?? true,
      },
    });
    return this.mapToItem(result);
  }

  async updateItem(id: number, data: Partial<CreateInventoryItemDto>): Promise<InventoryItem> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unitOfMeasure !== undefined) updateData.unit_of_measure = data.unitOfMeasure;
    if (data.unitCost !== undefined) updateData.unit_cost = data.unitCost;
    if (data.quantityOnHand !== undefined) updateData.quantity_on_hand = data.quantityOnHand;
    if (data.reorderPoint !== undefined) updateData.reorder_point = data.reorderPoint;
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.isBillable !== undefined) updateData.is_billable = data.isBillable;

    const result = await this.prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });
    return this.mapToItem(result);
  }

  async adjustStock(itemId: number, quantityChange: number): Promise<InventoryItem> {
    const result = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantity_on_hand: {
          increment: quantityChange,
        },
      },
    });
    return this.mapToItem(result);
  }

  // ============================================================================
  // INVENTORY USAGE
  // ============================================================================

  async recordUsage(dto: RecordInventoryUsageDto): Promise<InventoryUsage> {
    // Fetch item for cost snapshot
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
    });

    if (!item) {
      throw new Error(`Inventory item ${dto.inventoryItemId} not found`);
    }

    if (!item.is_active) {
      throw new Error(`Inventory item "${item.name}" is inactive`);
    }

    if (item.quantity_on_hand < dto.quantityUsed) {
      throw new Error(
        `Insufficient stock for "${item.name}": requested ${dto.quantityUsed}, available ${item.quantity_on_hand}`
      );
    }

    // Use a transaction: record usage + decrement stock atomically
    const [usage] = await this.prisma.$transaction([
      this.prisma.inventoryUsage.create({
        data: {
          inventory_item_id: dto.inventoryItemId,
          surgical_case_id: dto.surgicalCaseId ?? null,
          appointment_id: dto.appointmentId ?? null,
          quantity_used: dto.quantityUsed,
          unit_cost_at_time: item.unit_cost,
          total_cost: dto.quantityUsed * item.unit_cost,
          recorded_by: dto.recordedBy,
          notes: dto.notes ?? null,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: dto.inventoryItemId },
        data: {
          quantity_on_hand: {
            decrement: dto.quantityUsed,
          },
        },
      }),
    ]);

    return this.mapToUsage(usage);
  }

  async findUsageBySurgicalCase(surgicalCaseId: string): Promise<InventoryUsageWithItem[]> {
    const results = await this.prisma.inventoryUsage.findMany({
      where: { surgical_case_id: surgicalCaseId },
      include: { inventory_item: true },
      orderBy: { created_at: 'asc' },
    });
    return results.map(this.mapToUsageWithItem.bind(this));
  }

  async findUsageByAppointment(appointmentId: number): Promise<InventoryUsageWithItem[]> {
    const results = await this.prisma.inventoryUsage.findMany({
      where: { appointment_id: appointmentId },
      include: { inventory_item: true },
      orderBy: { created_at: 'asc' },
    });
    return results.map(this.mapToUsageWithItem.bind(this));
  }

  async linkUsageToBillItem(usageId: number, billItemId: number): Promise<InventoryUsage> {
    const result = await this.prisma.inventoryUsage.update({
      where: { id: usageId },
      data: { bill_item_id: billItemId },
    });
    return this.mapToUsage(result);
  }
}
