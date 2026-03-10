import { NextRequest, NextResponse } from 'next/server';
import { inventoryModule } from '@/application/inventory-module';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { StockMovementType } from '@/domain/interfaces/repositories/IInventoryRepository';

/**
 * POST /api/inventory/transaction
 * 
 * Record a manual stock movement (In, Out, Adjustment).
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

    const body = await request.json();
    const { itemId, type, quantity, unitPrice, reference, notes } = body;

    if (!itemId || !type || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: itemId, type, quantity' },
        { status: 400 }
      );
    }

    let transaction;
    const dto = {
      inventoryItemId: itemId,
      quantity,
      unitPrice,
      reference,
      notes,
      createdById: authResult.user.userId,
    };

    switch (type) {
      case StockMovementType.STOCK_IN:
        transaction = await inventoryModule.inventoryService.recordStockIn(dto);
        break;
      case StockMovementType.STOCK_OUT:
        transaction = await inventoryModule.inventoryService.recordStockOut(dto);
        break;
      case StockMovementType.ADJUSTMENT:
        transaction = await inventoryModule.inventoryService.recordAdjustment(dto);
        break;
      case StockMovementType.OPENING_BALANCE:
        if (authResult.user.role !== Role.ADMIN) {
          return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
        }
        transaction = await inventoryModule.inventoryService.setOpeningBalance(dto);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid transaction type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction recorded successfully',
    });
  } catch (error: any) {
    console.error('[API] POST /api/inventory/transaction - Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
