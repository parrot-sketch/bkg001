/**
 * Submit Purchase Order Route
 * 
 * POST /api/stores/purchase-orders/[id]/submit
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { parseSubmitPurchaseOrderRequest } from '@/lib/parsers/purchaseOrderParsers';
import { getPurchaseOrderService } from '@/lib/factories/purchaseOrderFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const purchaseOrderService = getPurchaseOrderService();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  const timer = endpointTimer('POST /api/stores/purchase-orders/[id]/submit');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'SUBMIT_PURCHASE_ORDERS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await Promise.resolve(context.params);
    const body = await request.json();
    const dto = parseSubmitPurchaseOrderRequest(body);

    const po = await purchaseOrderService.submitPurchaseOrder(id, dto);

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitPurchaseOrderSubmitted(
      id,
      authzResult.user.userId,
      authzResult.user.role as any,
      { poNumber: po.po_number }
    ).catch(() => {
      console.warn('[Audit] Failed to emit PURCHASE_ORDER_SUBMITTED event', { poId: id });
    });

    timer.end({ userId: authzResult.user.userId, poId: id });
    return handleApiSuccess(po, 200);
  } catch (error) {
    const { id: poId } = await context.params;
    timer.end({ poId, error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
