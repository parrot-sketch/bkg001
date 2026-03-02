/**
 * Recompute Payment Totals Endpoint
 * 
 * POST /api/admin/billing/recompute-payment
 * 
 * Safety tool to recompute payment totals from bill lines.
 * ADMIN only.
 */

import { NextRequest } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError } from '@/application/errors';
import { authorizeRoles } from '@/lib/auth/inventoryAuthorization';
import { Role } from '@/domain/enums/Role';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const RecomputePaymentSchema = z.object({
  paymentId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const timer = endpointTimer('POST /api/admin/billing/recompute-payment');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeRoles(authResult, [Role.ADMIN]);
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Only ADMIN can recompute payment totals'));
    }

    const body = await request.json();
    let parsed;
    try {
      parsed = RecomputePaymentSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error, 'Invalid request body');
      }
      throw error;
    }

    // Verify payment exists
    const payment = await db.payment.findUnique({
      where: { id: parsed.paymentId },
      include: {
        bill_items: {
          select: {
            total_cost: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment with ID ${parsed.paymentId} not found`, 'Payment', parsed.paymentId.toString());
    }

    // Recompute total from bill items
    const recomputedTotal = payment.bill_items.reduce((sum, item) => sum + item.total_cost, 0);
    const discount = payment.discount || 0;
    const finalTotal = recomputedTotal - discount;

    // Update payment if total differs
    let updated = payment;
    if (Math.abs(payment.total_amount - finalTotal) > 0.01) {
      updated = await db.payment.update({
        where: { id: parsed.paymentId },
        data: {
          total_amount: finalTotal,
        },
        include: {
          bill_items: true,
        },
      });
    }

    const responseData = {
      paymentId: updated.id,
      previousTotal: payment.total_amount,
      recomputedTotal: finalTotal,
      difference: finalTotal - payment.total_amount,
      billItemsCount: updated.bill_items.length,
      wasUpdated: Math.abs(payment.total_amount - finalTotal) > 0.01,
    };

    timer.end({ userId: authzResult.user.userId, paymentId: parsed.paymentId });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
