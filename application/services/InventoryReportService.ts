/**
 * Inventory Report Service
 * 
 * Shared service for generating stock and consumption reports.
 * Used by both admin and theater-tech report endpoints.
 */

import { PrismaClient } from '@prisma/client';
import { Role } from '@/domain/enums/Role';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';

export interface StockReportParams {
  belowReorderOnly?: boolean;
  category?: InventoryCategory;
  activeOnly?: boolean;
}

export interface ConsumptionReportParams {
  from?: Date;
  to?: Date;
  category?: InventoryCategory;
  sourceFormKey?: SourceFormKey;
  groupBy?: 'day' | 'category' | 'item' | 'user' | 'source';
}

export interface StockReportItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  unitOfMeasure: string;
  quantityOnHand: number;
  reorderPoint: number;
  isActive: boolean;
  isBelowReorderPoint: boolean;
  unitCost?: number;
  stockValue?: number;
}

export interface StockReportResponse {
  items: StockReportItem[];
  summary: {
    totalItems: number;
    itemsBelowReorderPoint: number;
    totalStockValue?: number;
    averageUnitCost?: number;
  };
  filters: {
    belowReorderOnly: boolean;
    category: string | null;
    activeOnly: boolean;
  };
}

export interface ConsumptionReportResponse {
  totals: {
    totalQuantity: number;
    totalCost: number;
    billableCost: number;
    nonBillableCost: number;
  };
  grouped: Array<{
    key: string;
    quantity: number;
    cost: number;
    billableCost: number;
    nonBillableCost: number;
    items: Array<{
      inventoryItemId: number;
      itemName: string;
      category: string;
      quantityUsed: number;
      unitCost: number;
      totalCost: number;
      isBillable: boolean;
      usedAt: Date;
      usedByUserId: string | null;
      usedByUserName: string | null;
      sourceFormKey: string | null;
    }>;
  }>;
  filters: {
    from: string;
    to: string;
    category: string | null;
    sourceFormKey: string | null;
    groupBy: string;
  };
}

export class InventoryReportService {
  constructor(private readonly db: PrismaClient) {}

  async buildStockReport(params: StockReportParams, requesterRole: Role): Promise<StockReportResponse> {
    const belowReorderOnly = params.belowReorderOnly ?? true;
    const category = params.category;
    const activeOnly = params.activeOnly ?? true;

    const where: any = {};
    if (activeOnly) {
      where.is_active = true;
    }
    if (category) {
      where.category = category as any;
    }

    const rawItems = await this.db.inventoryItem.findMany({
      where,
      include: {
        batches: {
          select: {
            quantity_remaining: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    let items = rawItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit_of_measure: item.unit_of_measure,
      reorder_point: item.reorder_point,
      is_active: item.is_active,
      unit_cost: item.unit_cost,
      quantity_on_hand: (item.batches || []).reduce((sum: number, batch: any) => sum + (batch.quantity_remaining || 0), 0),
    }));

    if (belowReorderOnly) {
      items = items.filter((item) => item.quantity_on_hand <= item.reorder_point);
    }

    const isAdmin = requesterRole === Role.ADMIN;

    let totalStockValue = 0;
    if (isAdmin) {
      for (const item of items) {
        const unitCostNum = typeof item.unit_cost === 'number'
          ? item.unit_cost
          : item.unit_cost.toNumber();
        totalStockValue += item.quantity_on_hand * unitCostNum;
      }
    }

    const formattedItems: StockReportItem[] = items.map((item) => {
      const unitCostNum = typeof item.unit_cost === 'number'
        ? item.unit_cost
        : item.unit_cost.toNumber();
      const base: StockReportItem = {
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unitOfMeasure: item.unit_of_measure,
        quantityOnHand: item.quantity_on_hand,
        reorderPoint: item.reorder_point,
        isActive: item.is_active,
        isBelowReorderPoint: item.quantity_on_hand <= item.reorder_point,
      };

      if (isAdmin) {
        return {
          ...base,
          unitCost: unitCostNum,
          stockValue: item.quantity_on_hand * unitCostNum,
        };
      }

      return base;
    });

    const response: StockReportResponse = {
      items: formattedItems,
      summary: {
        totalItems: items.length,
        itemsBelowReorderPoint: items.filter((item) => item.quantity_on_hand <= item.reorder_point).length,
        ...(isAdmin
          ? {
              totalStockValue,
              averageUnitCost: items.length > 0 ? totalStockValue / items.reduce((sum, item) => sum + item.quantity_on_hand, 0) : 0,
            }
          : {}),
      },
      filters: {
        belowReorderOnly,
        category: category || null,
        activeOnly,
      },
    };

    return response;
  }

  async buildConsumptionReport(params: ConsumptionReportParams): Promise<ConsumptionReportResponse> {
    const to = params.to ? new Date(params.to) : new Date();
    const from = params.from ? new Date(params.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const where: any = {
      used_at: {
        gte: from,
        lte: to,
      },
    };

    if (params.sourceFormKey) {
      where.source_form_key = params.sourceFormKey;
    }

    const usageRecords = await this.db.inventoryUsage.findMany({
      where,
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            category: true,
            is_billable: true,
          },
        },
        bill_item: {
          select: {
            id: true,
            total_cost: true,
          },
        },
      },
    });

    const userIds = [...new Set(usageRecords.map(r => r.used_by_user_id || r.recorded_by).filter(Boolean))];
    let users: any[] = [];
    if (this.db.user) {
      users = userIds.length > 0 ? await this.db.user.findMany({
        where: { id: { in: userIds as string[] } },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      }) : [];
    }
    const userMap = new Map(users.map(u => [u.id, u]));

    let filteredRecords = usageRecords;
    if (params.category) {
      filteredRecords = usageRecords.filter(
        (record) => (record as any).inventory_item?.category === params.category
      );
    }

    let totalQuantity = 0;
    let totalCost = 0;
    let billableCost = 0;
    let nonBillableCost = 0;

    for (const record of filteredRecords) {
      const rec = record as any;
      const item = rec.inventory_item || {};
      totalQuantity += (rec.quantity_used || 0);
      totalCost += (rec.total_cost || 0);
      if (item.is_billable && rec.bill_item) {
        billableCost += (rec.bill_item.total_cost || 0);
      } else {
        nonBillableCost += (rec.total_cost || 0);
      }
    }

    const grouped: Record<string, any> = {};

    for (const record of filteredRecords) {
      const rec = record as any;
      const item = rec.inventory_item || {};
      let groupKey: string;

      switch (params.groupBy) {
        case 'day':
          groupKey = rec.used_at
            ? new Date(rec.used_at).toISOString().split('T')[0]
            : 'unknown';
          break;
        case 'category':
          groupKey = item.category || 'unknown';
          break;
        case 'item':
          groupKey = item.id?.toString() || 'unknown';
          break;
        case 'user':
          groupKey = rec.used_by_user_id || rec.recorded_by || 'unknown';
          break;
        case 'source':
          groupKey = rec.source_form_key || 'unknown';
          break;
        default:
          groupKey = 'unknown';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          key: groupKey,
          quantity: 0,
          cost: 0,
          billableCost: 0,
          nonBillableCost: 0,
          items: [],
        };
      }

      grouped[groupKey].quantity += (rec.quantity_used || 0);
      grouped[groupKey].cost += (rec.total_cost || 0);
      if (item.is_billable && rec.bill_item) {
        grouped[groupKey].billableCost += (rec.bill_item.total_cost || 0);
      } else {
        grouped[groupKey].nonBillableCost += (rec.total_cost || 0);
      }

      const userId = rec.used_by_user_id || rec.recorded_by;
      const user = userId ? userMap.get(userId) : null;
      let usedByUserName: string | null = null;
      if (user) {
        const u = user as any;
        usedByUserName = `${u.first_name || u.firstName || ''} ${u.last_name || u.lastName || ''}`.trim() || u.email;
      }

      grouped[groupKey].items.push({
        inventoryItemId: item.id,
        itemName: item.name,
        category: item.category,
        quantityUsed: rec.quantity_used,
        unitCost: rec.unit_cost_at_time,
        totalCost: rec.total_cost,
        isBillable: item.is_billable,
        usedAt: rec.used_at,
        usedByUserId: userId || null,
        usedByUserName,
        sourceFormKey: rec.source_form_key,
      });
    }

    return {
      totals: {
        totalQuantity,
        totalCost,
        billableCost,
        nonBillableCost,
      },
      grouped: Object.values(grouped),
      filters: {
        from: from.toISOString(),
        to: to.toISOString(),
        category: params.category || null,
        sourceFormKey: params.sourceFormKey || null,
        groupBy: params.groupBy || 'day',
      },
    };
  }
}
