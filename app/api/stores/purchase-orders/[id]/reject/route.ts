/**
 * POST /api/stores/purchase-orders/[id]/reject
 * 
 * Reject a submitted purchase order
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { getPurchaseOrderService } from '@/lib/factories/purchaseOrderFactory';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const poService = getPurchaseOrderService();

const RejectSchema = z.object({
  reason: z.string().trim().min(10, 'Rejection reason is required (min 10 characters)'),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('POST /api/stores/purchase-orders/[id]/reject');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    // RBAC: We use APPROVE_PURCHASE_ORDERS operation equivalent for rejecting
    const authzResult = authorizeInventoryOperation(authResult, 'APPROVE_PURCHASE_ORDERS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await context.params;
    
    let body;
    try {
      body = await request.json();
    } catch {
      return handleApiError(new ValidationError('Invalid JSON body'));
    }

    const validationResult = RejectSchema.safeParse(body);
    if (!validationResult.success) {
      const err = ValidationError.fromZodError(validationResult.error, 'Invalid rejection payload');
      return handleApiError(err);
    }

    const po = await poService.rejectPurchaseOrder(
      id,
      authzResult.user.userId,
      validationResult.data.reason
    );

    timer.end({ userId: authzResult.user.userId, poId: id, status: 'CANCELLED' });
    return handleApiSuccess(po);
  } catch (error) {
    const { id: poId } = await context.params;
    timer.end({ poId, error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
