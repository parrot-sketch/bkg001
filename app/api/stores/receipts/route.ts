/**
 * Goods Receipts Routes
 * 
 * GET /api/stores/receipts - List goods receipts
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import db from '@/lib/db';
import { endpointTimer } from '@/lib/observability/endpointLogger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/stores/receipts');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_PURCHASE_ORDERS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    const where: any = {};

    if (fromDate || toDate) {
      where.received_at = {};
      if (fromDate) {
        where.received_at.gte = new Date(fromDate);
      }
      if (toDate) {
        where.received_at.lte = new Date(toDate);
      }
    }

    const receipts = await db.goodsReceipt.findMany({
      where,
      include: {
        purchase_order: {
          select: {
            id: true,
            po_number: true,
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        received_by: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        receipt_items: {
          select: {
            id: true,
            quantity_received: true,
            unit_cost: true,
          },
        },
      },
      orderBy: { received_at: 'desc' },
    });

    // Client-side filtering for search
    let filteredReceipts = receipts;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredReceipts = receipts.filter(
        (r) =>
          r.receipt_number.toLowerCase().includes(searchLower) ||
          r.purchase_order.po_number.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const totalCount = filteredReceipts.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedReceipts = filteredReceipts.slice(startIndex, endIndex);

    timer.end({ userId: authzResult.user.userId, count: paginatedReceipts.length, total: totalCount });
    return handleApiSuccess(
      {
        data: paginatedReceipts,
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
