/**
 * API Route: GET /api/inventory/transaction
 * 
 * List inventory transactions, optionally filtered by item ID.
 * 
 * Security:
 * - Requires authentication
 * - ADMIN, DOCTOR, NURSE, FRONTDESK, THEATER_TECHNICIAN can view transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const inventoryRepository = new PrismaInventoryRepository(db);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/inventory/transaction');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_ITEMS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: any = {};
    if (itemId) {
      where.inventory_item_id = parseInt(itemId, 10);
    }

    const [transactions, total] = await Promise.all([
      db.inventoryTransaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.inventoryTransaction.count({ where }),
    ]);

    const mapped = transactions.map((t) => ({
      id: t.id,
      inventoryItemId: t.inventory_item_id,
      type: t.type,
      quantity: t.quantity,
      unitPrice: t.unit_price,
      totalValue: t.total_value,
      reference: t.reference,
      notes: t.notes,
      createdById: t.created_by_user_id,
      createdAt: t.created_at,
    }));

    timer.end({ userId: authzResult.user.userId, count: mapped.length });
    return handleApiSuccess({
      data: mapped,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
      },
    }, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
