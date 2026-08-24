/**
 * GET /api/theater-tech/dashboard
 *
 * Aggregated metrics for the theater-tech dashboard. Returns patient registry
 * counts and surgical-case counts by status in a single round-trip so the
 * dashboard never re-fetches the full case list just to render summaries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus } from '@prisma/client';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authResult.user.role !== Role.THEATER_TECHNICIAN && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalRecords, newToday, newThisMonth, caseGroups] = await Promise.all([
      db.patient.count(),
      db.patient.count({ where: { created_at: { gte: today } } }),
      db.patient.count({ where: { created_at: { gte: monthStart } } }),
      db.surgicalCase.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of caseGroups) {
      byStatus[g.status] = g._count._all;
    }

    const statusCases = (statuses: SurgicalCaseStatus[]) =>
      statuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);

    const [
      totalItems,
      lowStockItems,
      outOfStockItems,
      expiringCount,
      itemsWithCost,
    ] = await Promise.all([
      db.inventoryItem.count({ where: { is_active: true } }),
      db.inventoryItem.findMany({
        where: { is_active: true },
        include: { batches: { select: { quantity_remaining: true } } },
      }),
      db.inventoryItem.findMany({
        where: { is_active: true },
        include: { batches: { select: { quantity_remaining: true } } },
      }),
      db.inventoryBatch.count({
        where: {
          expiry_date: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
          quantity_remaining: { gt: 0 },
        },
      }),
      db.inventoryItem.findMany({
        where: { is_active: true },
        include: { batches: { select: { quantity_remaining: true } } },
      }),
    ]);

    const lowStockCount = lowStockItems
      .map(item => ({
        ...item,
        quantity_on_hand: item.batches.reduce((sum, b) => sum + b.quantity_remaining, 0),
      }))
      .filter(item => item.quantity_on_hand <= item.reorder_point).length;

    const outOfStockCount = outOfStockItems
      .map(item => ({
        ...item,
        quantity_on_hand: item.batches.reduce((sum, b) => sum + b.quantity_remaining, 0),
      }))
      .filter(item => item.quantity_on_hand <= 0).length;

    const totalValue = itemsWithCost.reduce((sum, item) => {
      const qty = item.batches.reduce((s, b) => s + b.quantity_remaining, 0);
      const unitCostNum = typeof item.unit_cost === 'number' ? item.unit_cost : (item.unit_cost ? item.unit_cost.toNumber() : 0);
      return sum + (qty * unitCostNum);
    }, 0);

    const recentCases = await db.surgicalCase.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true, file_number: true } },
        primary_surgeon: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        patients: { totalRecords, newToday, newThisMonth },
        surgicalCases: {
          total: caseGroups.reduce((sum, g) => sum + g._count._all, 0),
          byStatus,
          planning: statusCases([SurgicalCaseStatus.DRAFT, SurgicalCaseStatus.PLANNING]),
          wardPrep: statusCases([SurgicalCaseStatus.READY_FOR_WARD_PREP, SurgicalCaseStatus.IN_WARD_PREP]),
          booking: statusCases([SurgicalCaseStatus.READY_FOR_THEATER_BOOKING, SurgicalCaseStatus.SCHEDULED]),
          live: statusCases([SurgicalCaseStatus.IN_PREP, SurgicalCaseStatus.IN_THEATER, SurgicalCaseStatus.RECOVERY]),
          done: statusCases([SurgicalCaseStatus.COMPLETED, SurgicalCaseStatus.CANCELLED]),
        },
        inventory: {
          totalItems,
          lowStockCount,
          outOfStockCount,
          expiringSoonCount: expiringCount,
          totalValue,
        },
        recentCases: recentCases.map((c) => ({
          id: c.id,
          status: c.status,
          procedure_name: c.procedure_name,
          procedure_date: c.procedure_date,
          diagnosis: c.diagnosis,
          created_at: c.created_at.toISOString(),
          patient: {
            id: c.patient.id,
            first_name: c.patient.first_name,
            last_name: c.patient.last_name,
            file_number: c.patient.file_number,
          },
          primary_surgeon: c.primary_surgeon,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching theater-tech dashboard metrics:', error);
    return NextResponse.json({ success: false, error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}
