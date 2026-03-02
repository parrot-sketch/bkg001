/**
 * Stock Report Endpoint
 * 
 * GET /api/admin/inventory/report/stock
 * 
 * Returns current stock levels with reorder point indicators.
 * ADMIN and STORES can access (STORES sees limited fields).
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeRoles } from '@/lib/auth/inventoryAuthorization';
import { Role } from '@/domain/enums/Role';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const StockReportQuerySchema = z.object({
  belowReorderOnly: z.string().transform((val) => val === 'true').optional(),
  category: z.nativeEnum(InventoryCategory).optional(),
  activeOnly: z.string().transform((val) => val === 'true').optional(),
}).transform((data) => ({
  belowReorderOnly: data.belowReorderOnly ?? true,
  category: data.category,
  activeOnly: data.activeOnly ?? true,
}));

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/admin/inventory/report/stock');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeRoles(authResult, [Role.ADMIN, Role.STORES]);
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Only ADMIN or STORES can view stock reports'));
    }

    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    let parsed;
    try {
      parsed = StockReportQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error, 'Invalid stock report query parameters');
      }
      throw error;
    }

    // Build where clause
    const where: any = {};
    if (parsed.activeOnly) {
      where.is_active = true;
    }
    if (parsed.category) {
      where.category = parsed.category;
    }

    // Fetch inventory items
    let items = await db.inventoryItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        unit_of_measure: true,
        quantity_on_hand: true,
        reorder_point: true,
        is_active: true,
        unit_cost: true, // Will be omitted for STORES
      },
      orderBy: [
        { quantity_on_hand: 'asc' }, // Low stock first
        { name: 'asc' },
      ],
    });

    // Filter by belowReorderOnly in application layer (Prisma doesn't support column comparison in where)
    if (parsed.belowReorderOnly) {
      items = items.filter((item) => item.quantity_on_hand <= item.reorder_point);
    }

    const isAdmin = authzResult.user.role === Role.ADMIN;

    // Calculate totals (ADMIN only)
    let totalStockValue = 0;
    if (isAdmin) {
      for (const item of items) {
        totalStockValue += item.quantity_on_hand * item.unit_cost;
      }
    }

    // Format response (omit unit_cost for STORES)
    const formattedItems = items.map((item) => {
      const base = {
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
          unitCost: item.unit_cost,
          stockValue: item.quantity_on_hand * item.unit_cost,
        };
      }

      return base;
    });

    const responseData = {
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
        belowReorderOnly: parsed.belowReorderOnly,
        category: parsed.category || null,
        activeOnly: parsed.activeOnly,
      },
    };

    timer.end({ userId: authzResult.user.userId, role: authzResult.user.role });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
