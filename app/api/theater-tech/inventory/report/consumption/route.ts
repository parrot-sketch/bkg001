/**
 * Theater-Tech Consumption Report Endpoint
 * 
 * GET /api/theater-tech/inventory/report/consumption
 * 
 * Returns inventory consumption data with filters and grouping.
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
import { InventoryReportService, ConsumptionReportParams } from '@/application/services/InventoryReportService';
import db from '@/lib/db';

const inventoryReportService = new InventoryReportService(db);

const ConsumptionReportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  category: z.nativeEnum(InventoryCategory).optional(),
  sourceFormKey: z.string().optional(),
  groupBy: z.enum(['day', 'category', 'item', 'user', 'source']).optional().default('day'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/theater-tech/inventory/report/consumption');
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
      parsed = ConsumptionReportQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error, 'Invalid consumption report query parameters');
      }
      throw error;
    }

    const params: ConsumptionReportParams = {
      from: parsed.from ? new Date(parsed.from) : undefined,
      to: parsed.to ? new Date(parsed.to) : undefined,
      category: parsed.category,
      sourceFormKey: parsed.sourceFormKey as any,
      groupBy: parsed.groupBy,
    };

    const responseData = await inventoryReportService.buildConsumptionReport(params);

    timer.end({ userId: authzResult.user.userId });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
