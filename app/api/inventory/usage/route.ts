/**
 * API Route: GET/POST /api/inventory/usage
 * 
 * Record and query inventory usage during procedures.
 * 
 * GET  - List usage records (filter by surgical case or appointment)
 * POST - Record usage of an inventory item
 * 
 * Security:
 * - Requires authentication
 * - DOCTOR, NURSE can record usage (during surgery)
 * - ADMIN can view all usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

const inventoryRepository = new PrismaInventoryRepository(db);

/**
 * GET /api/inventory/usage
 * 
 * List usage records filtered by surgical case or appointment.
 * Query params: ?surgicalCaseId=xxx or ?appointmentId=123
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

    const viewRoles = [Role.ADMIN, Role.DOCTOR, Role.NURSE];
    if (!viewRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const surgicalCaseId = searchParams.get('surgicalCaseId');
    const appointmentId = searchParams.get('appointmentId');

    if (!surgicalCaseId && !appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Either surgicalCaseId or appointmentId is required' },
        { status: 400 }
      );
    }

    let usageRecords;
    if (surgicalCaseId) {
      usageRecords = await inventoryRepository.findUsageBySurgicalCase(surgicalCaseId);
    } else {
      usageRecords = await inventoryRepository.findUsageByAppointment(parseInt(appointmentId!, 10));
    }

    const totalCost = usageRecords.reduce((sum, u) => sum + u.totalCost, 0);
    const billableCost = usageRecords
      .filter(u => u.item.isBillable)
      .reduce((sum, u) => sum + u.totalCost, 0);

    return NextResponse.json({
      success: true,
      data: {
        usageRecords,
        summary: {
          totalItems: usageRecords.length,
          totalCost,
          billableCost,
          nonBillableCost: totalCost - billableCost,
        },
      },
    });
  } catch (error) {
    console.error('[API] GET /api/inventory/usage - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/usage
 * 
 * Record usage of an inventory item during a surgical case or appointment.
 * Stock is decremented automatically.
 * 
 * Request Body:
 * {
 *   inventoryItemId: number,
 *   surgicalCaseId?: string,
 *   appointmentId?: number,
 *   quantityUsed: number,
 *   notes?: string,
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

    const recordRoles = [Role.ADMIN, Role.DOCTOR, Role.NURSE];
    if (!recordRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
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

    if (!body.inventoryItemId || !body.quantityUsed || body.quantityUsed <= 0) {
      return NextResponse.json(
        { success: false, error: 'inventoryItemId and positive quantityUsed are required' },
        { status: 400 }
      );
    }

    if (!body.surgicalCaseId && !body.appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Either surgicalCaseId or appointmentId is required' },
        { status: 400 }
      );
    }

    const usage = await inventoryRepository.recordUsage({
      inventoryItemId: body.inventoryItemId,
      surgicalCaseId: body.surgicalCaseId,
      appointmentId: body.appointmentId,
      quantityUsed: body.quantityUsed,
      recordedBy: authResult.user.userId,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      data: { usage },
      message: 'Inventory usage recorded successfully',
    }, { status: 201 });
  } catch (error: any) {
    // Handle known business rule errors
    if (error.message?.includes('Insufficient stock') ||
        error.message?.includes('not found') ||
        error.message?.includes('inactive')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('[API] POST /api/inventory/usage - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
