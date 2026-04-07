import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { getPurchaseOrderService } from '@/lib/factories/purchaseOrderFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const purchaseOrderService = getPurchaseOrderService();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const timer = endpointTimer(`GET /api/stores/purchase-orders/${id}`);
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_PURCHASE_ORDERS');

    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const po = await purchaseOrderService.getPurchaseOrderById(id);

    timer.end({ userId: authzResult.user.userId, poId: po.id });
    return handleApiSuccess({ data: po }, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
