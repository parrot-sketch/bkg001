/**
 * API Route: GET /api/payments/all
 * 
 * Get all payments for admin billing dashboard.
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Check authorization - only ADMIN
    if (authResult.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Admin only' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const billType = searchParams.get('billType');
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    // 4. Build where clause
    const where: any = {};
    if (status && ['PAID', 'PART', 'UNPAID'].includes(status)) {
      where.status = status;
    }
    if (billType) {
      where.bill_type = billType;
    }

    // 5. Fetch all payments with relations
    const payments = await db.payment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointment_date: true,
            time: true,
            doctor: {
              select: {
                name: true,
              },
            },
          },
        },
        surgical_case: {
          select: {
            id: true,
            procedure_name: true,
            primary_surgeon: {
              select: {
                name: true,
              },
            },
          },
        },
        bill_items: {
          include: {
            service: {
              select: {
                service_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        bill_date: 'desc',
      },
      take: limit,
    });

    // 6. Calculate summary
    const allPayments = await db.payment.findMany({
      where,
    });

    const totalBilled = allPayments.reduce((sum, p) => sum + p.total_amount, 0);
    const totalCollected = allPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const pendingCount = allPayments.filter(p => p.status !== 'PAID').length;
    const paidCount = allPayments.filter(p => p.status === 'PAID').length;

    // 7. Map response
    const mappedPayments = payments.map(p => ({
      id: p.id,
      patientId: p.patient_id,
      appointmentId: p.appointment_id,
      surgicalCaseId: p.surgical_case_id,
      billType: p.bill_type,
      billDate: p.bill_date,
      paymentDate: p.payment_date,
      discount: p.discount,
      totalAmount: p.total_amount,
      amountPaid: p.amount_paid,
      paymentMethod: p.payment_method,
      status: p.status,
      receiptNumber: p.receipt_number,
      notes: p.notes,
      createdAt: p.created_at,
      patient: p.patient ? {
        id: p.patient.id,
        firstName: p.patient.first_name,
        lastName: p.patient.last_name,
        phone: p.patient.phone,
      } : undefined,
      appointment: p.appointment ? {
        id: p.appointment.id,
        appointmentDate: p.appointment.appointment_date,
        time: p.appointment.time,
        doctorName: p.appointment.doctor?.name,
      } : null,
      surgicalCase: p.surgical_case ? {
        id: p.surgical_case.id,
        procedureName: p.surgical_case.procedure_name,
        surgeonName: p.surgical_case.primary_surgeon?.name,
      } : null,
      billItems: p.bill_items?.map(item => ({
        id: item.id,
        serviceName: item.service?.service_name || 'Unknown',
        quantity: item.quantity,
        unitCost: item.unit_cost,
        totalCost: item.total_cost,
      })),
    }));

    // 8. Return response
    return NextResponse.json({
      success: true,
      data: {
        payments: mappedPayments,
        summary: {
          totalBilled,
          totalCollected,
          pendingCount,
          paidCount,
        },
      },
    });
  } catch (error) {
    console.error('[API] GET /api/payments/all - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
