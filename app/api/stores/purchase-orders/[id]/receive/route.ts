/**
 * Goods Receipt Route
 * 
 * POST /api/stores/purchase-orders/[id]/receive
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { getGoodsReceiptService } from '@/lib/factories/goodsReceiptFactory';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const goodsReceiptService = getGoodsReceiptService();

const ReceiveGoodsSchema = z.object({
  receiptItems: z
    .array(
      z.object({
        poItemId: z.number().int().positive(),
        quantityReceived: z.number().int().positive(),
        unitCost: z.number().nonnegative(),
        batchNumber: z.string().optional(),
        expiryDate: z.string().optional(), // Accepts YYYY-MM-DD from date inputs
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one receipt item is required'),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('POST /api/stores/purchase-orders/[id]/receive');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'RECEIVE_GOODS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await context.params;
    const body = await request.json();

    let dto;
    try {
      dto = ReceiveGoodsSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[receive] Zod validation failed:', JSON.stringify(error.issues, null, 2));
        console.error('[receive] Request body was:', JSON.stringify(body, null, 2));
        throw ValidationError.fromZodError(error, 'Invalid goods receipt request');
      }
      throw error;
    }

    const receipt = await goodsReceiptService.receiveGoods(
      id,
      dto,
      authzResult.user.userId
    );

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitGoodsReceiptPosted(
      receipt.id.toString(),
      authzResult.user.userId,
      authzResult.user.role as any,
      { receiptNumber: receipt.receipt_number, poId: id, itemCount: dto.receiptItems.length }
    ).catch(() => {
      console.warn('[Audit] Failed to emit GOODS_RECEIPT_POSTED event', { receiptId: receipt.id });
    });

    timer.end({ userId: authzResult.user.userId, poId: id, receiptId: receipt.id });
    return handleApiSuccess(receipt, 201);
  } catch (error) {
    const { id: poId } = await context.params;
    timer.end({ poId, error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
