/**
 * API Route: GET /api/payments/pending
 * 
 * Get pending payments for frontdesk billing queue.
 * 
 * Security:
 * - Requires authentication
 * - Only FRONTDESK and ADMIN roles can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaPaymentRepository } from '@/infrastructure/database/repositories/PrismaPaymentRepository';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

const paymentRepository = new PrismaPaymentRepository(db);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Check permissions
    const allowedRoles = [Role.FRONTDESK, Role.ADMIN];
    if (!allowedRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 4. Fetch pending payments
    const pendingPayments = await paymentRepository.findPendingPayments(limit);
    const todaySummary = await paymentRepository.getTodaySummary();

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: {
        payments: pendingPayments,
        summary: todaySummary,
      },
    });
  } catch (error) {
    console.error('[API] /api/payments/pending - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
