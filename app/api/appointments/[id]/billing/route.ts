/**
 * API Route: GET/PUT /api/appointments/:id/billing
 * 
 * Manage billing for an appointment.
 * 
 * GET - Get existing billing record for an appointment
 * PUT - Create or update billing items for an appointment
 * 
 * Security:
 * - Requires authentication
 * - DOCTOR can view/update billing for their own appointments
 * - FRONTDESK and ADMIN can view/update any billing
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

/**
 * GET /api/appointments/:id/billing
 * 
 * Get the billing/payment record for an appointment, including bill items and services.
 */
export async function GET(
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
    const allowedRoles = [Role.DOCTOR, Role.FRONTDESK, Role.ADMIN];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 4. If doctor, verify they own this appointment
    if (userRole === Role.DOCTOR) {
      const doctor = await db.doctor.findUnique({
        where: { user_id: authResult.user.userId },
        select: { id: true },
      });
      if (doctor) {
        const appointment = await db.appointment.findUnique({
          where: { id: appointmentId },
          select: { doctor_id: true },
        });
        if (appointment && appointment.doctor_id !== doctor.id) {
          return NextResponse.json(
            { success: false, error: 'Access denied: Not your appointment' },
            { status: 403 }
          );
        }
      }
    }

    // 5. Find payment for this appointment
    const payment = await db.payment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointment_date: true,
            time: true,
            doctor_id: true,
            type: true,
            status: true,
            doctor: {
              select: {
                name: true,
                consultation_fee: true,
              },
            },
          },
        },
        bill_items: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!payment) {
      // No billing record yet — return null with appointment info
      const appointment = await db.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: {
            select: { consultation_fee: true, name: true },
          },
          patient: {
            select: { id: true, first_name: true, last_name: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          payment: null,
          appointment: appointment ? {
            id: appointment.id,
            status: appointment.status,
            type: appointment.type,
            doctorName: appointment.doctor?.name,
            consultationFee: appointment.doctor?.consultation_fee || 0,
            patientName: `${appointment.patient?.first_name} ${appointment.patient?.last_name}`,
          } : null,
        },
      });
    }

    // 6. Map response
    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          patientId: payment.patient_id,
          appointmentId: payment.appointment_id,
          billDate: payment.bill_date,
          paymentDate: payment.payment_date,
          discount: payment.discount,
          totalAmount: payment.total_amount,
          amountPaid: payment.amount_paid,
          paymentMethod: payment.payment_method,
          status: payment.status,
          receiptNumber: payment.receipt_number,
          patient: payment.patient ? {
            id: payment.patient.id,
            firstName: payment.patient.first_name,
            lastName: payment.patient.last_name,
          } : undefined,
          appointment: payment.appointment ? {
            id: payment.appointment.id,
            type: payment.appointment.type,
            status: payment.appointment.status,
            doctorName: payment.appointment.doctor?.name,
          } : undefined,
          billItems: payment.bill_items.map(item => ({
            id: item.id,
            serviceId: item.service_id,
            serviceName: item.service?.service_name || 'Unknown Service',
            serviceCategory: item.service?.category || null,
            quantity: item.quantity,
            unitCost: item.unit_cost,
            totalCost: item.total_cost,
            serviceDate: item.service_date,
          })),
        },
      },
    });
  } catch (error) {
    console.error('[API] GET /api/appointments/[id]/billing - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/appointments/:id/billing
 * 
 * Create or update billing items for an appointment.
 * Doctors use this during consultation to specify which services were rendered.
 * 
 * Request Body:
 * {
 *   billingItems: Array<{ serviceId: number, quantity: number, unitCost: number }>,
 *   discount?: number,
 *   customTotalAmount?: number
 * }
 */
export async function PUT(
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

    // 3. Check authorization (DOCTOR, FRONTDESK, ADMIN)
    const userRole = authResult.user.role as Role;
    const allowedRoles = [Role.DOCTOR, Role.FRONTDESK, Role.ADMIN];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 4. Parse body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { billingItems, discount, customTotalAmount } = body;

    // 5. Validate billing items
    if (!billingItems || !Array.isArray(billingItems) || billingItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one billing item is required' },
        { status: 400 }
      );
    }

    for (const item of billingItems) {
      if (!item.serviceId || !item.quantity || item.quantity <= 0 || !item.unitCost || item.unitCost < 0) {
        return NextResponse.json(
          { success: false, error: 'Each billing item must have serviceId, positive quantity, and non-negative unitCost' },
          { status: 400 }
        );
      }
    }

    // 6. Verify appointment exists
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { id: true } },
        doctor: { select: { id: true, user_id: true, consultation_fee: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // If doctor, verify they own this appointment
    if (userRole === Role.DOCTOR && appointment.doctor.user_id !== authResult.user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Not your appointment' },
        { status: 403 }
      );
    }

    // 7. Calculate total from items
    const calculatedTotal = billingItems.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitCost), 0
    );
    const finalTotal = customTotalAmount ?? calculatedTotal;
    const finalDiscount = discount ?? 0;

    // 8. Check if payment already exists
    const existingPayment = await db.payment.findUnique({
      where: { appointment_id: appointmentId },
      include: { bill_items: true },
    });

    let paymentId: number;

    if (existingPayment) {
      // Update existing payment — delete old bill items, create new ones
      // Only allow updates if payment hasn't been fully paid
      if (existingPayment.status === 'PAID') {
        return NextResponse.json(
          { success: false, error: 'Cannot update billing — payment already completed' },
          { status: 400 }
        );
      }

      // Delete old bill items
      await db.patientBill.deleteMany({
        where: { payment_id: existingPayment.id },
      });

      // Update payment record
      await db.payment.update({
        where: { id: existingPayment.id },
        data: {
          total_amount: finalTotal,
          discount: finalDiscount,
          bill_items: {
            create: billingItems.map((item: any) => ({
              service_id: item.serviceId,
              service_date: new Date(),
              quantity: item.quantity,
              unit_cost: item.unitCost,
              total_cost: item.quantity * item.unitCost,
            })),
          },
        },
      });

      paymentId = existingPayment.id;
    } else {
      // Create new payment with bill items
      const newPayment = await db.payment.create({
        data: {
          patient_id: appointment.patient.id,
          appointment_id: appointmentId,
          bill_date: new Date(),
          total_amount: finalTotal,
          discount: finalDiscount,
          amount_paid: 0,
          payment_method: 'CASH',
          status: 'UNPAID',
          bill_items: {
            create: billingItems.map((item: any) => ({
              service_id: item.serviceId,
              service_date: new Date(),
              quantity: item.quantity,
              unit_cost: item.unitCost,
              total_cost: item.quantity * item.unitCost,
            })),
          },
        },
      });

      paymentId = newPayment.id;
    }

    // 9. Fetch updated payment with relations
    const updatedPayment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        bill_items: {
          include: { service: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId,
        totalAmount: finalTotal,
        discount: finalDiscount,
        status: updatedPayment?.status || 'UNPAID',
        billItems: updatedPayment?.bill_items.map(item => ({
          id: item.id,
          serviceId: item.service_id,
          serviceName: item.service?.service_name || 'Unknown Service',
          quantity: item.quantity,
          unitCost: item.unit_cost,
          totalCost: item.total_cost,
        })) || [],
      },
      message: existingPayment ? 'Billing updated successfully' : 'Billing created successfully',
    });
  } catch (error) {
    console.error('[API] PUT /api/appointments/[id]/billing - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
