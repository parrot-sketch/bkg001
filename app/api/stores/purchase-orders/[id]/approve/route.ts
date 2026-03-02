/**
 * Approve Purchase Order Route
 * 
 * POST /api/stores/purchase-orders/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { getPurchaseOrderService } from '@/lib/factories/purchaseOrderFactory';
import { Role } from '@/domain/enums/Role';
import { authorizeRoles } from '@/lib/auth/inventoryAuthorization';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const purchaseOrderService = getPurchaseOrderService();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('POST /api/stores/purchase-orders/[id]/approve');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeRoles(authResult, [Role.ADMIN]);
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Only ADMIN can approve purchase orders'));
    }

    const { id } = await context.params;
    const po = await purchaseOrderService.approvePurchaseOrder(id, authzResult.user.userId);

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitPurchaseOrderApproved(
      id,
      authzResult.user.userId,
      authzResult.user.role as any,
      { poNumber: po.po_number, approvedBy: authzResult.user.userId }
    ).catch(() => {
      console.warn('[Audit] Failed to emit PURCHASE_ORDER_APPROVED event', { poId: id });
    });

    timer.end({ userId: authzResult.user.userId, poId: id });
    return handleApiSuccess(po, 200);
  } catch (error) {
    const { id: poId } = await context.params;
    timer.end({ poId, error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
