/**
 * API Route: POST/GET /api/doctor/surgical-cases/[caseId]/planned-items
 *
 * Planned items API for surgical case planning.
 *
 * POST - Replace planned items for a case plan
 * GET  - Retrieve planned items for a case plan
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR or ADMIN can access
 * - Doctor must be the primary surgeon on the case
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError, GateBlockedError } from '@/application/errors';
import { parsePlannedItemsRequest } from '@/lib/parsers/inventoryBillingParsers';
import { getInventoryConsumptionBillingService } from '@/lib/factories/inventoryBillingFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

// ─── Shared Helpers ────────────────────────────────────────────────────────

async function resolveDoctorId(userId: string): Promise<string | null> {
  const doc = await db.doctor.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  return doc?.id ?? null;
}

async function authorizeDoctorAccess(
  caseId: string,
  doctorId: string,
  userId: string,
  role: string
): Promise<void> {
  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      primary_surgeon_id: true,
      staff_invites: {
        where: {
          invited_user_id: userId,
          status: 'ACCEPTED',
        },
        select: { id: true },
      },
    },
  });

  if (!surgicalCase) {
    throw new NotFoundError(`Surgical case with ID ${caseId} not found`, 'SurgicalCase', caseId);
  }

  const isPrimary = surgicalCase.primary_surgeon_id === doctorId;
  const hasAcceptedInvite = surgicalCase.staff_invites.length > 0;
  const isAdmin = role === Role.ADMIN;

  if (!isPrimary && !hasAcceptedInvite && !isAdmin) {
    throw new ForbiddenError('Only the primary surgeon or invited doctors can manage planned items');
  }
}

async function getOrCreateCasePlan(caseId: string, appointmentId: number | null): Promise<number> {
  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      patient_id: true,
      primary_surgeon_id: true,
      consultation: { select: { appointment_id: true } },
      case_plan: { select: { id: true, appointment_id: true } },
    },
  });

  if (!surgicalCase) {
    throw new NotFoundError(`Surgical case with ID ${caseId} not found`, 'SurgicalCase', caseId);
  }

  const finalAppointmentId = appointmentId || surgicalCase.case_plan?.appointment_id || surgicalCase.consultation?.appointment_id;

  if (!finalAppointmentId) {
    throw new GateBlockedError(
      'No appointment linked to this case. Cannot create plan.',
      'MISSING_APPOINTMENT',
      []
    );
  }

  if (surgicalCase.case_plan) {
    return surgicalCase.case_plan.id;
  }

  // Create case plan
  const casePlan = await db.casePlan.create({
    data: {
      appointment_id: finalAppointmentId,
      patient_id: surgicalCase.patient_id,
      doctor_id: surgicalCase.primary_surgeon_id!,
      surgical_case_id: caseId,
    },
  });

  return casePlan.id;
}

// ─── POST ──────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    const { role, userId } = authResult.user;
    if (role !== Role.DOCTOR && role !== Role.ADMIN) {
      return handleApiError(new ForbiddenError('Only doctors and admins can manage planned items'));
    }

    const { caseId } = await context.params;
    const timer = endpointTimer('POST /api/doctor/surgical-cases/[caseId]/planned-items');

    const doctorId = await resolveDoctorId(userId);
    if (!doctorId && role !== Role.ADMIN) {
      return handleApiError(new NotFoundError('Doctor profile not found', 'Doctor', userId));
    }

    if (doctorId) {
      await authorizeDoctorAccess(caseId, doctorId, userId, role);
    }

    const body = await request.json();
    const validated = parsePlannedItemsRequest(body);

    // Get or create case plan
    const casePlanId = await getOrCreateCasePlan(caseId, null);

    // Validate inventory items and services exist and are active
    const inventoryItemIds = validated.items.map((item) => item.inventoryItemId);
    const serviceIds = validated.services?.map((s) => s.serviceId) || [];

    const inventoryItems = await db.inventoryItem.findMany({
      where: { id: { in: inventoryItemIds } },
      select: { id: true, name: true, is_active: true, unit_cost: true },
    });

    const services = serviceIds.length > 0
      ? await db.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, service_name: true, is_active: true, price: true },
        })
      : [];

    // Check for missing or inactive items
    const missingItems: Array<{ inventoryItemId: number; reason: string }> = [];
    const missingServices: Array<{ serviceId: number; reason: string }> = [];

    for (const item of validated.items) {
      const found = inventoryItems.find((i) => i.id === item.inventoryItemId);
      if (!found) {
        missingItems.push({ inventoryItemId: item.inventoryItemId, reason: 'Not found' });
      } else if (!found.is_active) {
        missingItems.push({ inventoryItemId: item.inventoryItemId, reason: 'Inactive' });
      }
    }

    for (const service of validated.services || []) {
      const found = services.find((s) => s.id === service.serviceId);
      if (!found) {
        missingServices.push({ serviceId: service.serviceId, reason: 'Not found' });
      } else if (!found.is_active) {
        missingServices.push({ serviceId: service.serviceId, reason: 'Inactive' });
      }
    }

    if (missingItems.length > 0 || missingServices.length > 0) {
      const error = new GateBlockedError(
        'Some inventory items or services are missing or inactive',
        'INVALID_ITEMS',
        []
      );
      // Add metadata via parent DomainException
      (error as any).metadata = {
        ...error.metadata,
        items: missingItems,
        services: missingServices,
      };
      throw error;
    }

    // Transaction: replace planned items
    const result = await db.$transaction(async (tx) => {
      // Delete existing planned items
      await tx.casePlanPlannedItem.deleteMany({
        where: { case_plan_id: casePlanId },
      });

      // Create new planned inventory items
      const plannedItems = await Promise.all(
        validated.items.map(async (item) => {
          const inventoryItem = inventoryItems.find((i) => i.id === item.inventoryItemId)!;
          return tx.casePlanPlannedItem.create({
            data: {
              case_plan_id: casePlanId,
              inventory_item_id: item.inventoryItemId,
              planned_quantity: item.plannedQuantity,
              planned_unit_price: inventoryItem.unit_cost,
              notes: item.notes || null,
              planned_by_user_id: userId,
            },
          });
        })
      );

      // Create new planned services
      const plannedServices = await Promise.all(
        (validated.services || []).map(async (service) => {
          const serviceRecord = services.find((s) => s.id === service.serviceId)!;
          return tx.casePlanPlannedItem.create({
            data: {
              case_plan_id: casePlanId,
              service_id: service.serviceId,
              planned_quantity: service.plannedQuantity || 1,
              planned_unit_price: serviceRecord.price,
              notes: service.notes || null,
              planned_by_user_id: userId,
            },
          });
        })
      );

      // Compute cost estimate
      const consumptionService = getInventoryConsumptionBillingService();
      const costEstimate = await consumptionService.previewPlanCost({
        items: validated.items.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          plannedQuantity: item.plannedQuantity,
        })),
      });

      const serviceTotal = (validated.services || []).reduce((sum, s) => {
        const serviceRecord = services.find((sr) => sr.id === s.serviceId)!;
        return sum + serviceRecord.price * (s.plannedQuantity || 1);
      }, 0);

      return {
        plannedItems: plannedItems.map((pi) => ({
          id: pi.id,
          inventoryItemId: pi.inventory_item_id,
          plannedQuantity: pi.planned_quantity,
          plannedUnitPrice: pi.planned_unit_price,
          notes: pi.notes,
        })),
        plannedServices: plannedServices.map((ps) => ({
          id: ps.id,
          serviceId: ps.service_id,
          plannedQuantity: ps.planned_quantity,
          plannedUnitPrice: ps.planned_unit_price,
          notes: ps.notes,
        })),
        costEstimate: {
          billableTotal: costEstimate.billableTotal,
          nonBillableTotal: costEstimate.nonBillableTotal,
          serviceTotal,
          grandTotal: costEstimate.grandTotal + serviceTotal,
        },
      };
    });

    timer.end({ caseId });
    return handleApiSuccess(result);
  } catch (error) {
    console.error('[API] POST /api/doctor/surgical-cases/[caseId]/planned-items - Error:', error);
    return handleApiError(error);
  }
}

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

    const { role, userId } = authResult.user;
    if (role !== Role.DOCTOR && role !== Role.ADMIN) {
      return handleApiError(new ForbiddenError('Only doctors and admins can view planned items'));
    }

    const { caseId } = await context.params;
    const timer = endpointTimer('GET /api/doctor/surgical-cases/[caseId]/planned-items');

    const doctorId = await resolveDoctorId(userId);
    if (!doctorId && role !== Role.ADMIN) {
      return handleApiError(new NotFoundError('Doctor profile not found', 'Doctor', userId));
    }

    if (doctorId) {
      await authorizeDoctorAccess(caseId, doctorId, userId, role);
    }

    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        case_plan: {
          select: {
            id: true,
            planned_items: {
              include: {
                inventory_item: {
                  select: { id: true, name: true, unit_cost: true, is_billable: true },
                },
                service: {
                  select: { id: true, service_name: true, price: true },
                },
              },
            },
          },
        },
      },
    });

    if (!surgicalCase) {
      return handleApiError(new NotFoundError(`Surgical case with ID ${caseId} not found`, 'SurgicalCase', caseId));
    }

    if (!surgicalCase.case_plan) {
      return handleApiSuccess({
        plannedItems: [],
        plannedServices: [],
        costEstimate: {
          billableTotal: 0,
          nonBillableTotal: 0,
          serviceTotal: 0,
          grandTotal: 0,
        },
      });
    }

    const plannedItems = surgicalCase.case_plan.planned_items
      .filter((pi) => pi.inventory_item_id !== null)
      .map((pi) => ({
        id: pi.id,
        inventoryItemId: pi.inventory_item_id!,
        itemName: pi.inventory_item?.name || 'Unknown',
        plannedQuantity: pi.planned_quantity,
        plannedUnitPrice: pi.planned_unit_price,
        notes: pi.notes,
        isBillable: pi.inventory_item?.is_billable || false,
      }));

    const plannedServices = surgicalCase.case_plan.planned_items
      .filter((pi) => pi.service_id !== null)
      .map((pi) => ({
        id: pi.id,
        serviceId: pi.service_id!,
        serviceName: pi.service?.service_name || 'Unknown',
        plannedQuantity: pi.planned_quantity,
        plannedUnitPrice: pi.planned_unit_price,
        notes: pi.notes,
      }));

    const billableTotal = plannedItems
      .filter((pi) => pi.isBillable)
      .reduce((sum, pi) => sum + pi.plannedQuantity * pi.plannedUnitPrice, 0);

    const nonBillableTotal = plannedItems
      .filter((pi) => !pi.isBillable)
      .reduce((sum, pi) => sum + pi.plannedQuantity * pi.plannedUnitPrice, 0);

    const serviceTotal = plannedServices.reduce(
      (sum, ps) => sum + ps.plannedQuantity * ps.plannedUnitPrice,
      0
    );

    timer.end({ caseId });
    return handleApiSuccess({
      plannedItems,
      plannedServices,
      costEstimate: {
        billableTotal,
        nonBillableTotal,
        serviceTotal,
        grandTotal: billableTotal + nonBillableTotal + serviceTotal,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/doctor/surgical-cases/[caseId]/planned-items - Error:', error);
    return handleApiError(error);
  }
}
