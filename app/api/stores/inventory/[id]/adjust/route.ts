/**
 * Stock Adjustment Route
 * 
 * POST /api/stores/inventory/[id]/adjust
 * 
 * ADMIN only. Requires adjustment reason.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeRoles } from '@/lib/auth/inventoryAuthorization';
import { Role } from '@/domain/enums/Role';
import { getStockAdjustmentService } from '@/lib/factories/stockAdjustmentFactory';
import { StockAdjustmentType, StockAdjustmentReason } from '@prisma/client';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const stockAdjustmentService = getStockAdjustmentService();

const StockAdjustmentSchema = z.object({
  adjustmentType: z.nativeEnum(StockAdjustmentType),
  adjustmentReason: z.nativeEnum(StockAdjustmentReason),
  quantityChange: z.number().int().positive('Quantity change must be positive'),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('POST /api/stores/inventory/[id]/adjust');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeRoles(authResult, [Role.ADMIN]);
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Only ADMIN can adjust stock'));
    }

    const { id } = await context.params;
    const inventoryItemId = parseInt(id, 10);
    if (isNaN(inventoryItemId)) {
      throw new ValidationError('Invalid inventory item ID', [
        { field: 'id', message: 'Must be a valid number' },
      ]);
    }

    const body = await request.json();
    let dto;
    try {
      dto = StockAdjustmentSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error, 'Invalid stock adjustment request');
      }
      throw error;
    }

    const adjustment = await stockAdjustmentService.createStockAdjustment(
      inventoryItemId,
      dto,
      authzResult.user.userId
    );

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitStockAdjusted(
      adjustment.id,
      authzResult.user.userId,
      authzResult.user.role as any,
      { itemId: inventoryItemId, adjustmentType: dto.adjustmentType, quantityChange: dto.quantityChange }
    ).catch(() => {
      console.warn('[Audit] Failed to emit STOCK_ADJUSTED event', { adjustmentId: adjustment.id });
    });

    timer.end({ userId: authzResult.user.userId, inventoryItemId, adjustmentId: adjustment.id });
    return handleApiSuccess(adjustment, 201);
  } catch (error) {
    const { id } = await context.params;
    timer.end({ inventoryItemId: parseInt(id, 10), error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
