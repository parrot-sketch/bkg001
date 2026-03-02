/**
 * Consumption Report Endpoint
 * 
 * GET /api/admin/inventory/report/consumption
 * 
 * Returns inventory consumption data with filters and grouping.
 * ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeRoles } from '@/lib/auth/inventoryAuthorization';
import { Role } from '@/domain/enums/Role';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const ConsumptionReportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  category: z.nativeEnum(InventoryCategory).optional(),
  sourceFormKey: z.nativeEnum(SourceFormKey).optional(),
  groupBy: z.enum(['day', 'category', 'item', 'user', 'source']).optional().default('day'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/admin/inventory/report/consumption');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeRoles(authResult, [Role.ADMIN]);
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Only ADMIN can view consumption reports'));
    }

    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    let parsed;
    try {
      parsed = ConsumptionReportQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error, 'Invalid consumption report query parameters');
      }
      throw error;
    }

    // Default date range: last 7 days
    const to = parsed.to ? new Date(parsed.to) : new Date();
    const from = parsed.from ? new Date(parsed.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Build where clause
    const where: any = {
      used_at: {
        gte: from,
        lte: to,
      },
    };

    if (parsed.sourceFormKey) {
      where.source_form_key = parsed.sourceFormKey;
    }

    // Fetch usage records with related data
    const usageRecords = await db.inventoryUsage.findMany({
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

    // Fetch user data separately for used_by_user_id
    const userIds = [...new Set(usageRecords.map(r => r.used_by_user_id || r.recorded_by).filter(Boolean))];
    const users = userIds.length > 0 ? await db.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // Filter by category if specified
    let filteredRecords = usageRecords;
    if (parsed.category) {
      filteredRecords = usageRecords.filter(
        (record) => record.inventory_item.category === parsed.category
      );
    }

    // Calculate totals
    let totalQuantity = 0;
    let totalCost = 0;
    let billableCost = 0;
    let nonBillableCost = 0;

    for (const record of filteredRecords) {
      totalQuantity += record.quantity_used;
      totalCost += record.total_cost;
      if (record.inventory_item.is_billable && record.bill_item) {
        billableCost += record.bill_item.total_cost;
      } else {
        nonBillableCost += record.total_cost;
      }
    }

    // Group data based on groupBy parameter
    const grouped: Record<string, any> = {};

    for (const record of filteredRecords) {
      let groupKey: string;

      switch (parsed.groupBy) {
        case 'day':
          groupKey = record.used_at
            ? new Date(record.used_at).toISOString().split('T')[0]
            : 'unknown';
          break;
        case 'category':
          groupKey = record.inventory_item.category;
          break;
        case 'item':
          groupKey = record.inventory_item.id.toString();
          break;
        case 'user':
          groupKey = record.used_by_user_id || record.recorded_by || 'unknown';
          break;
        case 'source':
          groupKey = record.source_form_key || 'unknown';
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

      grouped[groupKey].quantity += record.quantity_used;
      grouped[groupKey].cost += record.total_cost;
      if (record.inventory_item.is_billable && record.bill_item) {
        grouped[groupKey].billableCost += record.bill_item.total_cost;
      } else {
        grouped[groupKey].nonBillableCost += record.total_cost;
      }

      // Add item details
      grouped[groupKey].items.push({
        inventoryItemId: record.inventory_item.id,
        itemName: record.inventory_item.name,
        category: record.inventory_item.category,
        quantityUsed: record.quantity_used,
        unitCost: record.unit_cost_at_time,
        totalCost: record.total_cost,
        isBillable: record.inventory_item.is_billable,
        usedAt: record.used_at,
        usedByUserId: record.used_by_user_id || record.recorded_by,
        usedByUserName: (() => {
          const userId = record.used_by_user_id || record.recorded_by;
          const user = userId ? userMap.get(userId) : null;
          return user
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
            : null;
        })(),
        sourceFormKey: record.source_form_key,
      });
    }

    const responseData = {
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
        category: parsed.category || null,
        sourceFormKey: parsed.sourceFormKey || null,
        groupBy: parsed.groupBy,
      },
    };

    timer.end({ userId: authzResult.user.userId });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
