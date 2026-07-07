/**
 * API Route: GET /api/payments/pending
 * 
 * Get payments for frontdesk billing queue.
 * Supports filtering by status parameter.
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
import { PaymentStatus } from '@/domain/enums/PaymentStatus';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

const paymentRepository = new PrismaPaymentRepository(db);

function mapPaymentToResponse(p: PaymentWithRelations) {
  return {
    id: p.id,
    patientId: p.patientId,
    appointmentId: p.appointmentId,
    surgicalCaseId: p.surgicalCaseId,
    billType: p.billType,
    billDate: p.billDate,
    paymentDate: p.paymentDate,
    discount: p.discount,
    totalAmount: p.totalAmount,
    amountPaid: p.amountPaid,
    paymentMethod: p.paymentMethod,
    status: p.status,
    receiptNumber: p.receiptNumber,
    notes: p.notes,
    chargeSheetNo: p.chargeSheetNo,
    finalizedAt: p.finalizedAt,
    createdAt: p.createdAt,
    patient: p.patient ? {
      id: p.patient.id,
      firstName: p.patient.firstName,
      lastName: p.patient.lastName,
      email: p.patient.email,
      phone: p.patient.phone,
      img: p.patient.img,
      fileNumber: p.patient.fileNumber,
    } : undefined,
    appointment: p.appointment,
    surgicalCase: p.surgicalCase,
    billItems: p.billItems,
  };
}

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
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 4. Fetch payments based on status filter
    let payments: PaymentWithRelations[];
    
    if (status && ['UNPAID', 'PART', 'PAID'].includes(status)) {
      payments = await paymentRepository.findByStatus(status as PaymentStatus, limit);
    } else {
      // Default: get pending payments (UNPAID and PART, finalized only)
      payments = await paymentRepository.findPendingPayments(limit);
    }

    // 5. Get summary (always returns all statuses for today)
    const todaySummary = await paymentRepository.getTodaySummary();

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        payments: payments.map(mapPaymentToResponse),
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