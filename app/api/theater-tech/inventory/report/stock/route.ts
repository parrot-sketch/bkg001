/**
 * Theater-Tech Stock Report Endpoint
 * 
 * GET /api/theater-tech/inventory/report/stock
 * 
 * Returns current stock levels with reorder point indicators.
 * THEATER_TECHNICIAN and ADMIN can access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { Role } from '@/domain/enums/Role';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { InventoryReportService, StockReportParams } from '@/application/services/InventoryReportService';
import db from '@/lib/db';

const inventoryReportService = new InventoryReportService(db);

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
  const timer = endpointTimer('GET /api/theater-tech/inventory/report/stock');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_REPORTS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
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

    const params: StockReportParams = {
      belowReorderOnly: parsed.belowReorderOnly,
      category: parsed.category,
      activeOnly: parsed.activeOnly,
    };

    const responseData = await inventoryReportService.buildStockReport(params, authzResult.user.role as Role);

    timer.end({ userId: authzResult.user.userId, role: authzResult.user.role });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
