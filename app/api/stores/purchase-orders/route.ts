/**
 * Purchase Order Routes
 * 
 * POST /api/stores/purchase-orders - Create purchase order
 * GET /api/stores/purchase-orders - List purchase orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { parseCreatePurchaseOrderRequest } from '@/lib/parsers/purchaseOrderParsers';
import { getPurchaseOrderService } from '@/lib/factories/purchaseOrderFactory';
import { PurchaseOrderStatus } from '@prisma/client';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const purchaseOrderService = getPurchaseOrderService();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('POST /api/stores/purchase-orders');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'CREATE_PURCHASE_ORDERS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const body = await request.json();
    const dto = parseCreatePurchaseOrderRequest(body);

    const po = await purchaseOrderService.createPurchaseOrder(dto, authzResult.user.userId);

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitPurchaseOrderCreated(
      po.id,
      authzResult.user.userId,
      authzResult.user.role as any,
      { poNumber: po.po_number, vendorId: po.vendor_id, itemCount: po.items?.length || 0 }
    ).catch(() => {
      console.warn('[Audit] Failed to emit PURCHASE_ORDER_CREATED event', { poId: po.id });
    });

    timer.end({ userId: authzResult.user.userId, poId: po.id });
    return handleApiSuccess(po, 201);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : "Unknown error" });
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/stores/purchase-orders');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_PURCHASE_ORDERS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam as PurchaseOrderStatus) : undefined;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    const pos = await purchaseOrderService.getPurchaseOrders(status);

    // Client-side filtering for search
    let filteredPOs = pos;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredPOs = pos.filter(
        (po) =>
          po.po_number.toLowerCase().includes(searchLower) ||
          po.vendor.name.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const totalCount = filteredPOs.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPOs = filteredPOs.slice(startIndex, endIndex);

    timer.end({ userId: authzResult.user.userId, count: paginatedPOs.length, total: totalCount });
    return handleApiSuccess(
      {
        data: paginatedPOs,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
        },
      },
      200
    );
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : "Unknown error" });
    return handleApiError(error);
  }
}
