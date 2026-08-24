/**
 * API Route: GET/PATCH /api/inventory/items/[id]
 * 
 * GET - Get a single inventory item by ID with balance and nearest expiry date.
 * PATCH - Update an inventory item by ID.
 * 
 * Security:
 * - Requires authentication
 * - ADMIN, DOCTOR, NURSE, FRONTDESK, THEATER_TECHNICIAN can view items
 * - ADMIN, STORES, THEATER_TECHNICIAN can update items
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import { InventoryService } from '@/application/services/InventoryService';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { UpdateItemSchema, formatValidationError } from '@/lib/validation/inventory';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

const inventoryRepository = new PrismaInventoryRepository(db);
const inventoryService = new InventoryService(inventoryRepository);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/inventory/items/[id]');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_ITEMS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await context.params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      throw new Error('Invalid inventory item ID');
    }

    const item = await inventoryRepository.findItemById(itemId);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    const [quantityOnHand, nearestExpiryDate] = await Promise.all([
      inventoryRepository.getItemBalance(itemId),
      inventoryRepository.getNearestExpiryDate(itemId),
    ]);

    const enrichedItem = {
      ...item,
      quantityOnHand,
      nearestExpiryDate,
    };

    timer.end({ userId: authzResult.user.userId, itemId });
    return handleApiSuccess(enrichedItem, 200);
  } catch (error) {
    const { id: itemId } = await context.params;
    timer.end({ itemId: parseInt(itemId, 10), error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('PATCH /api/inventory/items/[id]');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'UPDATE_ITEMS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await context.params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      throw new ValidationError('Invalid inventory item ID', [
        { field: 'id', message: 'Must be a valid number' },
      ]);
    }

    const body = await request.json();
    const validationResult = UpdateItemSchema.safeParse(body);
    if (!validationResult.success) {
      throw ValidationError.fromZodError(validationResult.error, 'Invalid item update request');
    }

    const updateData = validationResult.data;

    const item = await inventoryRepository.updateItem(itemId, {
      name: updateData.name,
      sku: updateData.sku,
      category: updateData.category,
      description: updateData.description,
      unitOfMeasure: updateData.unit_of_measure,
      unitCost: updateData.unit_cost,
      reorderPoint: updateData.reorder_point,
      lowStockThreshold: updateData.low_stock_threshold,
      supplier: updateData.supplier,
      manufacturer: updateData.manufacturer,
      isBillable: updateData.is_billable,
      isImplant: updateData.is_implant,
    });

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitItemUpdated(
      itemId,
      authzResult.user.userId,
      authzResult.user.role as any,
      { itemName: item.name, changes: updateData }
    ).catch(() => {
      console.warn('[Audit] Failed to emit INVENTORY_ITEM_UPDATED event', { itemId });
    });

    timer.end({ userId: authzResult.user.userId, itemId });
    return handleApiSuccess(item, 200);
  } catch (error) {
    const { id: itemId } = await context.params;
    timer.end({ itemId: parseInt(itemId, 10), error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
