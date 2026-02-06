/**
 * API Route: POST /api/payments/:id/record
 * 
 * Record a payment (partial or full).
 * 
 * Security:
 * - Requires authentication
 * - Only FRONTDESK and ADMIN roles can record payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaPaymentRepository } from '@/infrastructure/database/repositories/PrismaPaymentRepository';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';

const paymentRepository = new PrismaPaymentRepository(db);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;

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

    // 3. Parse payment ID
    const paymentId = parseInt(params.id, 10);
    if (isNaN(paymentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment ID' },
        { status: 400 }
      );
    }

    // 4. Parse request body
    let body: { amountPaid: number; paymentMethod: PaymentMethod };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // 5. Validate required fields
    if (typeof body.amountPaid !== 'number' || body.amountPaid <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount paid must be a positive number' },
        { status: 400 }
      );
    }

    if (!body.paymentMethod || !Object.values(PaymentMethod).includes(body.paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // 6. Record payment
    const updatedPayment = await paymentRepository.recordPayment({
      paymentId,
      amountPaid: body.amountPaid,
      paymentMethod: body.paymentMethod,
    });

    // 7. Generate receipt if fully paid
    if (updatedPayment.status === 'PAID' && !updatedPayment.receiptNumber) {
      await paymentRepository.generateReceipt(paymentId);
    }

    // 8. Return updated payment
    const payment = await paymentRepository.findById(paymentId);

    return NextResponse.json({
      success: true,
      data: payment,
      message: updatedPayment.status === 'PAID' 
        ? 'Payment completed successfully' 
        : 'Partial payment recorded',
    });
  } catch (error) {
    console.error('[API] /api/payments/[id]/record - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
