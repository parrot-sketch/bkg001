/**
 * API Route: POST /api/appointments/:id/billing/finalize
 * 
 * Finalize a charge sheet for an appointment, locking it for editing
 * and making it ready for payment collection.
 * 
 * Security:
 * - Requires authentication
 * - FRONTDESK and ADMIN can finalize any appointment charge sheet
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { chargeSheetService } from '@/application/services/ChargeSheetService';
import db from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;

    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse appointment ID
    const appointmentId = parseInt(params.id, 10);
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    // 3. Check authorization
    const userRole = authResult.user.role as Role;
    const allowedRoles = [Role.FRONTDESK, Role.ADMIN];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only frontdesk and admin can finalize charge sheets' },
        { status: 403 }
      );
    }

    // 4. Find payment for this appointment
    const payment = await db.payment.findUnique({
      where: { appointment_id: appointmentId },
      select: {
        id: true,
        patient_id: true,
        total_amount: true,
        amount_paid: true,
        discount: true,
        status: true,
        charge_sheet_no: true,
        finalized_at: true,
        finalized_by: true,
        bill_items: {
          include: {
            service: { select: { service_name: true } },
            inventory_item: { select: { name: true } },
          },
        },
      },
    });
    
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'No charge sheet found for this appointment. Create a charge sheet first.' },
        { status: 404 }
      );
    }

    // 5. Check if already finalized
    const isAlreadyFinalized = await chargeSheetService.isFinalized(payment.id);
    if (isAlreadyFinalized) {
      return NextResponse.json(
        { success: false, error: 'Charge sheet is already finalized' },
        { status: 400 }
      );
    }

    // 6. Finalize the charge sheet
    const finalizedPayment = await chargeSheetService.finalize(
      payment.id,
      authResult.user.userId
    );

    // 7. Return updated charge sheet
    return NextResponse.json({
      success: true,
      data: {
        id: finalizedPayment.id,
        patientId: finalizedPayment.patientId,
        totalAmount: finalizedPayment.totalAmount,
        amountPaid: finalizedPayment.amountPaid,
        discount: finalizedPayment.discount,
        status: finalizedPayment.status,
        receiptNumber: finalizedPayment.receiptNumber,
        chargeSheetNo: finalizedPayment.chargeSheetNo,
        finalizedAt: finalizedPayment.finalizedAt,
        finalizedBy: finalizedPayment.finalizedBy,
        billItems: finalizedPayment.billItems?.map((item: any) => ({
          id: item.id,
          serviceId: item.serviceId,
          serviceName: item.serviceName || 'Unknown Service',
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        })) || [],
      },
      message: 'Charge sheet finalized successfully',
    });

  } catch (error) {
    console.error('[API] POST /api/appointments/[id]/billing/finalize - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
