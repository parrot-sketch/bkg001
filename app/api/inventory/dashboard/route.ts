/**
 * API Route: GET /api/inventory/dashboard
 *
 * Dashboard data for inventory overview.
 * Returns summary stats and alerts for all roles.
 *
 * Security:
 * - Requires authentication (ADMIN, NURSE, THEATER_TECH, FRONTDESK)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const allowedRoles = [Role.ADMIN, Role.NURSE, Role.THEATER_TECHNICIAN, Role.FRONTDESK];
    if (!allowedRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get inventory stats
    const [
      totalItems,
      rawLowStockItems,
      outOfStockItems,
      rawCategoryBreakdown,
      recentItems,
    ] = await Promise.all([
      // Total active items
      db.inventoryItem.count({
        where: { is_active: true }
      }),

      // Low stock items - fetch with batches and calculate
      db.inventoryItem.findMany({
        where: {
          is_active: true,
        },
        include: {
          batches: {
            select: { quantity_remaining: true }
          }
        },
        orderBy: { name: 'asc' },
        take: 50,
      }),

      // Out of stock items - fetch with batches
      db.inventoryItem.findMany({
        where: {
          is_active: true,
        },
        include: {
          batches: {
            select: { quantity_remaining: true }
          }
        }
      }),

      // Category breakdown with batches
      db.inventoryItem.findMany({
        where: { is_active: true },
        include: {
          batches: {
            select: { quantity_remaining: true }
          }
        }
      }),

      // Recent items (last 5 added)
      db.inventoryItem.findMany({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          batches: {
            select: { quantity_remaining: true }
          }
        }
      })
    ]);

    // Calculate quantity_on_hand from batches
    const lowStockItems = rawLowStockItems
      .map(item => ({
        ...item,
        quantity_on_hand: item.batches.reduce((sum, b) => sum + b.quantity_remaining, 0)
      }))
      .filter(item => item.quantity_on_hand <= item.reorder_point)
      .slice(0, 10);

    const categoryBreakdownMap = new Map();
    for (const item of rawCategoryBreakdown) {
      const qty = item.batches.reduce((sum, b) => sum + b.quantity_remaining, 0);
      const existing = categoryBreakdownMap.get(item.category);
      if (existing) {
        existing.itemCount++;
        existing.totalQuantity += qty;
      } else {
        categoryBreakdownMap.set(item.category, {
          category: item.category,
          itemCount: 1,
          totalQuantity: qty
        });
      }
    }
    const categoryBreakdown = Array.from(categoryBreakdownMap.values());

    // Calculate quantity_on_hand for recent items
    const recentItemsWithStock = recentItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity_on_hand: item.batches.reduce((sum, b) => sum + b.quantity_remaining, 0),
      unit_cost: item.unit_cost,
      reorder_point: item.reorder_point
    }));

    // Get expiring batches (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringBatches = await db.inventoryBatch.findMany({
      where: {
        expiry_date: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        },
        quantity_remaining: { gt: 0 }
      },
      orderBy: { expiry_date: 'asc' },
      take: 10,
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    });

    // Calculate total inventory value
    const itemsWithCost = await db.inventoryItem.findMany({
      where: { is_active: true },
      include: {
        batches: {
          select: { quantity_remaining: true }
        }
      }
    });

    const totalValue = itemsWithCost.reduce((sum, item) => {
      const qty = item.batches.reduce((s, b) => s + b.quantity_remaining, 0);
      return sum + (qty * (item.unit_cost || 0));
    }, 0);

    // Calculate outOfStockItems count
    const outOfStockCount = outOfStockItems
      .map(item => ({
        ...item,
        quantity_on_hand: item.batches.reduce((sum, b) => sum + b.quantity_remaining, 0)
      }))
      .filter(item => item.quantity_on_hand <= 0).length;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalItems,
          lowStockCount: lowStockItems.length,
          outOfStockCount: outOfStockItems.length,
          expiringSoonCount: expiringBatches.length,
          totalValue
        },
        categoryBreakdown: categoryBreakdown.map(cat => ({
          category: cat.category,
          itemCount: cat._count.id,
          totalQuantity: cat._sum.quantity_on_hand || 0
        })),
        lowStockItems: lowStockItems.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          quantityOnHand: item.quantity_on_hand,
          reorderPoint: item.reorder_point,
          unitCost: item.unit_cost
        })),
        expiringBatches: expiringBatches.map(batch => ({
          id: batch.id,
          itemName: batch.inventory_item.name,
          category: batch.inventory_item.category,
          batchNumber: batch.batch_number,
          expiryDate: batch.expiry_date,
          quantityRemaining: batch.quantity_remaining
        })),
        recentItems: recentItemsWithStock.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          quantityOnHand: item.quantity_on_hand,
          unitCost: item.unit_cost,
          reorderPoint: item.reorder_point
        }))
      }
    });
  } catch (error) {
    console.error('[API] /api/inventory/dashboard GET - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
