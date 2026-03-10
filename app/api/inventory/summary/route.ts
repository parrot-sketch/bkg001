import { NextRequest, NextResponse } from 'next/server';
import { inventoryModule } from '@/application/inventory-module';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

/**
 * GET /api/inventory/summary
 * 
 * Returns aggregated stock levels and statuses for all active products.
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

    const summary = await inventoryModule.inventoryService.getDashboardSummary();

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[API] GET /api/inventory/summary - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
