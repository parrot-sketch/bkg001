/**
 * API Route: GET/POST /api/inventory/items
 * 
 * Manage clinic inventory items.
 * 
 * GET  - List inventory items (optionally filtered by category)
 * POST - Create a new inventory item
 * 
 * Security:
 * - Requires authentication
 * - ADMIN can create/update items
 * - DOCTOR, NURSE, FRONTDESK can view items
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

const inventoryRepository = new PrismaInventoryRepository(db);

/**
 * GET /api/inventory/items
 * 
 * List active inventory items. Optionally filter by category.
 * Query params: ?category=IMPLANT&lowStock=true
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const viewRoles = [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK];
    if (!viewRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as InventoryCategory | null;
    const lowStock = searchParams.get('lowStock') === 'true';
    const belowReorderOnly = searchParams.get('belowReorderOnly') === 'true';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    let items;
    if (lowStock || belowReorderOnly) {
      items = await inventoryRepository.findLowStockItems();
    } else {
      items = await inventoryRepository.findActiveItems(category || undefined);
    }

    // Client-side filtering for search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.sku?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const totalCount = items.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: {
        data: paginatedItems,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('[API] GET /api/inventory/items - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/items
 * 
 * Create a new inventory item. Admin only.
 * 
 * Request Body:
 * {
 *   name: string,
 *   sku?: string,
 *   category?: InventoryCategory,
 *   description?: string,
 *   unitOfMeasure?: string,
 *   unitCost: number,
 *   quantityOnHand?: number,
 *   reorderPoint?: number,
 *   supplier?: string,
 *   isBillable?: boolean,
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Admin only' },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }

    const item = await inventoryRepository.createItem({
      name: body.name,
      sku: body.sku,
      category: body.category,
      description: body.description,
      unitOfMeasure: body.unitOfMeasure,
      unitCost: body.unitCost || 0,
      reorderPoint: body.reorderPoint,
      supplier: body.supplier,
      manufacturer: body.manufacturer,
      isBillable: body.isBillable,
      isImplant: body.isImplant,
    });

    return NextResponse.json({
      success: true,
      data: { item },
      message: 'Inventory item created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/inventory/items - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
