/**
 * API Route: GET /api/nurse/surgical-cases/[caseId]/billing-summary
 *
 * Get billing summary for a surgical case.
 *
 * Security:
 * - Requires authentication
 * - Only NURSE, DOCTOR or ADMIN can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { endpointTimer } from '@/lib/observability/endpointLogger';

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    const { role } = authResult.user;
    if (role !== Role.NURSE && role !== Role.ADMIN && role !== Role.DOCTOR) {
      return handleApiError(new ForbiddenError('Only nurses, doctors and admins can view billing summaries'));
    }

    const { caseId } = await context.params;
    const timer = endpointTimer('GET /api/nurse/surgical-cases/[caseId]/billing-summary');

    // Load payment by surgical_case_id
    const payment = await db.payment.findUnique({
      where: { surgical_case_id: caseId },
      include: {
        bill_items: {
          include: {
            service: {
              select: { id: true, service_name: true, category: true },
            },
            inventory_usage: {
              include: {
                inventory_item: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    is_billable: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      // Return empty success (no payment yet)
      return handleApiSuccess({
        payment: null,
        billItems: [],
        usageSummary: {
          totalItemsUsed: 0,
          totalBillableCost: 0,
          totalNonBillableCost: 0,
          byCategory: {},
        },
      });
    }

    // Load all inventory usage records for this case
    const usageRecords = await db.inventoryUsage.findMany({
      where: { surgical_case_id: caseId },
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            category: true,
            is_billable: true,
          },
        },
      },
    });

    // Compute usage summary
    const totalItemsUsed = usageRecords.length;
    let totalBillableCost = 0;
    let totalNonBillableCost = 0;
    const byCategory: Record<string, { count: number; billableCost: number; nonBillableCost: number }> = {};

    for (const usage of usageRecords) {
      const cost = usage.total_cost;
      const category = usage.inventory_item.category || 'OTHER';

      if (usage.inventory_item.is_billable) {
        totalBillableCost += cost;
      } else {
        totalNonBillableCost += cost;
      }

      if (!byCategory[category]) {
        byCategory[category] = { count: 0, billableCost: 0, nonBillableCost: 0 };
      }

      byCategory[category].count += 1;
      if (usage.inventory_item.is_billable) {
        byCategory[category].billableCost += cost;
      } else {
        byCategory[category].nonBillableCost += cost;
      }
    }

    const responseDto = {
      payment: {
        id: payment.id,
        patientId: payment.patient_id,
        surgicalCaseId: payment.surgical_case_id,
        billDate: payment.bill_date,
        paymentDate: payment.payment_date,
        totalAmount: payment.total_amount,
        discount: payment.discount,
        amountPaid: payment.amount_paid,
        status: payment.status,
        paymentMethod: payment.payment_method,
      },
      billItems: payment.bill_items.map((bi) => ({
        id: bi.id,
        serviceId: bi.service_id,
        serviceName: bi.service?.service_name || 'Unknown',
        serviceDate: bi.service_date,
        quantity: bi.quantity,
        unitCost: bi.unit_cost,
        totalCost: bi.total_cost,
        inventoryUsage: bi.inventory_usage
          ? {
            id: bi.inventory_usage.id,
            inventoryItemId: bi.inventory_usage.inventory_item_id,
            itemName: bi.inventory_usage.inventory_item?.name || 'Unknown',
            quantityUsed: bi.inventory_usage.quantity_used,
          }
          : null,
      })),
      usageSummary: {
        totalItemsUsed,
        totalBillableCost,
        totalNonBillableCost,
        byCategory,
      },
    };

    timer.end({ caseId });
    return handleApiSuccess(responseDto);
  } catch (error) {
    console.error('[API] GET /api/nurse/surgical-cases/[caseId]/billing-summary - Error:', error);
    return handleApiError(error);
  }
}
