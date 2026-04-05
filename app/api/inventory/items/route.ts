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
import { InventoryService } from '@/application/services/InventoryService';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { ValidationError } from '@/application/errors/ValidationError';
import { CreateItemSchema, ItemQuerySchema, formatValidationError } from '@/lib/validation/inventory';
import type { CreateItem } from '@/lib/validation/inventory';
import type { InventoryItem } from '@/domain/interfaces/repositories/IInventoryRepository';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Enriched InventoryItem response that includes calculated balance
 */
interface InventoryItemWithBalance {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unitOfMeasure: string;
  unitCost: number;
  reorderPoint: number;
  lowStockThreshold: number;
  supplier: string | null;
  manufacturer: string | null;
  isActive: boolean;
  isBillable: boolean;
  isImplant: boolean;
  quantityOnHand: number; // Calculated from transactions
  createdAt: Date;
  updatedAt: Date;
}

const inventoryRepository = new PrismaInventoryRepository(db);
const inventoryService = new InventoryService(inventoryRepository);

/**
 * GET /api/inventory/items
 * 
 * List active inventory items with pagination and optional search/category filtering.
 * Uses database-level filtering for scalability.
 * 
 * Query params (validated with ItemQuerySchema):
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (optional, searches name and SKU, max 100 chars)
 * - category: InventoryCategory (optional)
 * - low_stock_only: boolean (optional, filters to low stock items)
 * 
 * Response includes quantityOnHand calculated from InventoryTransaction records.
 * 
 * Response:
 * - 200: Items retrieved successfully
 * - 400: Invalid query parameters
 * - 401: Authentication required
 * - 403: Access denied
 * - 500: Internal server error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ========================================================================
    // AUTHENTICATION & AUTHORIZATION
    // ========================================================================
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const viewRoles = [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK, Role.THEATER_TECHNICIAN];
    if (!viewRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // ========================================================================
    // PARSE AND VALIDATE QUERY PARAMETERS
    // ========================================================================
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      category: searchParams.get('category'),
      low_stock_only: searchParams.get('low_stock_only'),
    };

    const validationResult = ItemQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        formatValidationError(validationResult.error),
        { status: 400 }
      );
    }

    const { page, limit, search, category, low_stock_only } = validationResult.data;

    // ========================================================================
    // FETCH ITEMS WITH DATABASE-LEVEL FILTERING & PAGINATION
    // ========================================================================
    const paginatedResult = await inventoryService.searchAndPaginateItems({
      search: search && search.trim() ? search : undefined,
      category,
      page,
      limit,
    });

    // ========================================================================
    // ENRICH ITEMS WITH BALANCE CALCULATION
    // ========================================================================
    // Calculate quantity_on_hand for each item from InventoryTransaction records.
    // This ensures the balance is always current and audit-trail accurate.
    let enrichedItems: InventoryItemWithBalance[] = await Promise.all(
      paginatedResult.items.map(async (item: InventoryItem) => {
        const quantityOnHand = await inventoryRepository.getItemBalance(item.id);
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          description: item.description,
          unitOfMeasure: item.unitOfMeasure,
          unitCost: item.unitCost,
          reorderPoint: item.reorderPoint,
          lowStockThreshold: item.lowStockThreshold,
          supplier: item.supplier,
          manufacturer: item.manufacturer,
          isActive: item.isActive,
          isBillable: item.isBillable,
          isImplant: item.isImplant,
          quantityOnHand,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      })
    );

    // ========================================================================
    // APPLY LOW STOCK FILTER (if requested)
    // ========================================================================
    if (low_stock_only) {
      enrichedItems = enrichedItems.filter(
        (item) => item.quantityOnHand <= item.lowStockThreshold
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        data: enrichedItems,
        pagination: {
          total: paginatedResult.pagination.total,
          page: paginatedResult.pagination.page,
          limit: paginatedResult.pagination.limit,
          totalPages: paginatedResult.pagination.totalPages,
        },
      },
    });
  } catch (error) {
    console.error('[API] GET /api/inventory/items - Error:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.errors },
        { status: 400 }
      );
    }

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
 * Request Body (validated with CreateItemSchema):
 * {
 *   name: string (required, 1-255 chars),
 *   sku?: string (unique, 1-255 chars),
 *   category?: InventoryCategory,
 *   description?: string (max 1000 chars),
 *   unit_of_measure?: string (default: "unit"),
 *   unit_cost?: number (default: 0, min: 0),
 *   reorder_point?: number (default: 0),
 *   low_stock_threshold?: number (default: 0),
 *   supplier?: string,
 *   manufacturer?: string,
 *   is_billable?: boolean (default: true),
 *   is_implant?: boolean (default: false),
 * }
 * 
 * Response:
 * - 201: Item created successfully
 * - 400: Validation failed or invalid JSON
 * - 401: Authentication required
 * - 403: Admin access required
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ========================================================================
    // AUTHENTICATION & AUTHORIZATION
    // ========================================================================
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

    // ========================================================================
    // PARSE REQUEST BODY
    // ========================================================================
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // ========================================================================
    // VALIDATE REQUEST BODY
    // ========================================================================
    const validationResult = CreateItemSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        formatValidationError(validationResult.error),
        { status: 400 }
      );
    }

    const itemData: CreateItem = validationResult.data;

    // ========================================================================
    // CREATE ITEM
    // ========================================================================
    const item = await inventoryRepository.createItem({
      name: itemData.name,
      sku: itemData.sku,
      category: itemData.category || InventoryCategory.OTHER,
      description: itemData.description,
      unitOfMeasure: itemData.unit_of_measure,
      unitCost: itemData.unit_cost,
      reorderPoint: itemData.reorder_point,
      lowStockThreshold: itemData.low_stock_threshold,
      supplier: itemData.supplier,
      manufacturer: itemData.manufacturer,
      isBillable: itemData.is_billable,
      isImplant: itemData.is_implant,
    });

    return NextResponse.json({
      success: true,
      data: { item },
      message: 'Inventory item created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/inventory/items - Error:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
