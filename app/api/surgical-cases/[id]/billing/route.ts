/**
 * API Route: GET/PUT /api/surgical-cases/:id/billing
 * 
 * Manage billing for a surgical case.
 * Surgery billing is decoupled from appointment billing — a procedure
 * has its own Payment record with bill_type = 'SURGERY'.
 * 
 * GET - Get existing billing record for a surgical case
 * PUT - Create or update billing items for a surgical case
 * 
 * Security:
 * - Requires authentication
 * - DOCTOR (primary surgeon) can create/view/update billing
 * - FRONTDESK and ADMIN can view/update any billing
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

/**
 * GET /api/surgical-cases/:id/billing
 * 
 * Get the billing/payment record for a surgical case, including bill items,
 * inventory usage, and services.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const surgicalCaseId = params.id;

    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Check authorization
    const userRole = authResult.user.role as Role;
    const allowedRoles = [Role.DOCTOR, Role.FRONTDESK, Role.ADMIN];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 3. Verify surgical case exists
    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: surgicalCaseId },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true } },
        primary_surgeon: { select: { id: true, name: true, user_id: true } },
      },
    });

    if (!surgicalCase) {
      return NextResponse.json(
        { success: false, error: 'Surgical case not found' },
        { status: 404 }
      );
    }

    // 4. If doctor, verify they're the primary surgeon
    if (userRole === Role.DOCTOR && surgicalCase.primary_surgeon.user_id !== authResult.user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Not your surgical case' },
        { status: 403 }
      );
    }

    // 5. Find payment for this surgical case
    const payment = await db.payment.findUnique({
      where: { surgical_case_id: surgicalCaseId },
      include: {
        bill_items: {
          include: { service: true },
        },
      },
    });

    // 6. Get inventory usage for this surgical case
    const inventoryUsage = await db.inventoryUsage.findMany({
      where: { surgical_case_id: surgicalCaseId },
      include: { inventory_item: true },
      orderBy: { created_at: 'asc' },
    });

    if (!payment) {
      return NextResponse.json({
        success: true,
        data: {
          payment: null,
          surgicalCase: {
            id: surgicalCase.id,
            procedureName: surgicalCase.procedure_name,
            status: surgicalCase.status,
            surgeonName: surgicalCase.primary_surgeon?.name,
            patientName: `${surgicalCase.patient?.first_name} ${surgicalCase.patient?.last_name}`,
          },
          inventoryUsage: inventoryUsage.map(u => ({
            id: u.id,
            itemName: u.inventory_item?.name || 'Unknown',
            itemCategory: u.inventory_item?.category,
            quantityUsed: u.quantity_used,
            unitOfMeasure: u.inventory_item?.unit_of_measure || 'unit',
            unitCost: u.unit_cost_at_time,
            totalCost: u.total_cost,
            isBillable: u.inventory_item?.is_billable ?? true,
            isBilled: u.bill_item_id !== null,
            notes: u.notes,
          })),
        },
      });
    }

    // 7. Map response
    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          patientId: payment.patient_id,
          surgicalCaseId: payment.surgical_case_id,
          billType: payment.bill_type,
          billDate: payment.bill_date,
          paymentDate: payment.payment_date,
          discount: payment.discount,
          totalAmount: payment.total_amount,
          amountPaid: payment.amount_paid,
          paymentMethod: payment.payment_method,
          status: payment.status,
          receiptNumber: payment.receipt_number,
          notes: payment.notes,
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
        surgicalCase: {
          id: surgicalCase.id,
          procedureName: surgicalCase.procedure_name,
          status: surgicalCase.status,
          surgeonName: surgicalCase.primary_surgeon?.name,
          patientName: `${surgicalCase.patient?.first_name} ${surgicalCase.patient?.last_name}`,
        },
        inventoryUsage: inventoryUsage.map(u => ({
          id: u.id,
          itemName: u.inventory_item?.name || 'Unknown',
          itemCategory: u.inventory_item?.category,
          quantityUsed: u.quantity_used,
          unitOfMeasure: u.inventory_item?.unit_of_measure || 'unit',
          unitCost: u.unit_cost_at_time,
          totalCost: u.total_cost,
          isBillable: u.inventory_item?.is_billable ?? true,
          isBilled: u.bill_item_id !== null,
          notes: u.notes,
        })),
      },
    });
  } catch (error) {
    console.error('[API] GET /api/surgical-cases/[id]/billing - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/surgical-cases/:id/billing
 * 
 * Create or update billing for a surgical case.
 * 
 * Request Body:
 * {
 *   billingItems: Array<{ serviceId: number, quantity: number, unitCost: number }>,
 *   discount?: number,
 *   customTotalAmount?: number,
 *   includeInventory?: boolean,  // Auto-include billable inventory usage
 *   notes?: string,
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const surgicalCaseId = params.id;

    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Check authorization
    const userRole = authResult.user.role as Role;
    const allowedRoles = [Role.DOCTOR, Role.FRONTDESK, Role.ADMIN];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 3. Parse body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { billingItems, discount, customTotalAmount, includeInventory, notes } = body;

    // 4. Validate billing items
    if (!billingItems || !Array.isArray(billingItems) || billingItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one billing item is required' },
        { status: 400 }
      );
    }

    for (const item of billingItems) {
      if (!item.serviceId || !item.quantity || item.quantity <= 0 || item.unitCost === undefined || item.unitCost < 0) {
        return NextResponse.json(
          { success: false, error: 'Each billing item must have serviceId, positive quantity, and non-negative unitCost' },
          { status: 400 }
        );
      }
    }

    // 5. Verify surgical case exists
    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: surgicalCaseId },
      include: {
        patient: { select: { id: true } },
        primary_surgeon: { select: { id: true, user_id: true } },
      },
    });

    if (!surgicalCase) {
      return NextResponse.json(
        { success: false, error: 'Surgical case not found' },
        { status: 404 }
      );
    }

    // If doctor, verify ownership
    if (userRole === Role.DOCTOR && surgicalCase.primary_surgeon.user_id !== authResult.user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Not your surgical case' },
        { status: 403 }
      );
    }

    // 6. Calculate total from service items
    let calculatedTotal = billingItems.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitCost), 0
    );

    // 7. Optionally include billable inventory usage in the total
    let inventoryTotal = 0;
    if (includeInventory) {
      const inventoryUsage = await db.inventoryUsage.findMany({
        where: {
          surgical_case_id: surgicalCaseId,
          bill_item_id: null, // Only unbilled items
        },
        include: { inventory_item: true },
      });

      inventoryTotal = inventoryUsage
        .filter(u => u.inventory_item?.is_billable)
        .reduce((sum, u) => sum + u.total_cost, 0);

      calculatedTotal += inventoryTotal;
    }

    const finalTotal = customTotalAmount ?? calculatedTotal;
    const finalDiscount = discount ?? 0;

    // 8. Check if payment already exists
    const existingPayment = await db.payment.findUnique({
      where: { surgical_case_id: surgicalCaseId },
      include: { bill_items: true },
    });

    let paymentId: number;

    if (existingPayment) {
      // Update existing — only if not fully paid
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
          notes: notes ?? existingPayment.notes,
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
      // Create new surgery payment
      const newPayment = await db.payment.create({
        data: {
          patient_id: surgicalCase.patient.id,
          surgical_case_id: surgicalCaseId,
          bill_type: 'SURGERY',
          bill_date: new Date(),
          total_amount: finalTotal,
          discount: finalDiscount,
          amount_paid: 0,
          payment_method: 'CASH',
          status: 'UNPAID',
          notes: notes ?? null,
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
        billType: 'SURGERY',
        totalAmount: finalTotal,
        inventoryTotal,
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
      message: existingPayment ? 'Surgery billing updated successfully' : 'Surgery billing created successfully',
    });
  } catch (error) {
    console.error('[API] PUT /api/surgical-cases/[id]/billing - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
